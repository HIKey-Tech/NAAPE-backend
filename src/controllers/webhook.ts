import { Request, Response } from "express";
import { Subscription } from "../models/Subscription";
import { savePaymentHistory } from "../utils/savePaymentHistory";
import Event from "../models/Event";
import { Plan } from "../models/Plan";
import PaymentHistory from "../models/PaymentHistory";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";
import { subscriptionPaymentEmail, eventPaymentEmail } from "../utils/emailTemplates";
import { subscriptionPaymentEmailHTML, eventPaymentEmailHTML } from "../utils/emailTemplatesHTML";
import { Types } from "mongoose";

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers["verify-hash"] as string | undefined;

        if (!signature || signature !== process.env.FLW_HASH) {
            return res.status(401).send("unauthorised");
        }

        const event = req.body;

        /**
         * SUBSCRIPTION PAYMENT COMPLETED
         */
        if (event.event === "subscription.payment.completed") {
            const data = event.data;

            const subscription = await Subscription.findOne({
                flutterwaveSubscriptionId: data.subscription_id,
            });

            if (!subscription) {
                return res.status(404).json({ error: "Subscription not found" });
            }

            // Idempotency check
            if (subscription.status === "active") {
                return res.json({ status: "already processed" });
            }

            // Activate subscription
            subscription.status = "active";
            subscription.startDate = new Date();
            await subscription.save();

            // Save payment history
            await savePaymentHistory(
                data.customer.id,
                "subscription",
                data.tx_ref,
                data.amount,
                data.currency,
                "success",
                {
                    subscriptionId: data.subscription_id,
                }
            );
        }

        /**
         * SUBSCRIPTION CANCELLED
         */
        if (event.event === "subscription.cancelled") {
            await Subscription.findOneAndUpdate(
                { flutterwaveSubscriptionId: event.data.subscription_id },
                {
                    status: "cancelled",
                    endDate: new Date(),
                }
            );
        }

        /**
         * CHARGE COMPLETED
         */
        if (event.event === "charge.completed" && event.data.status === "successful") {
            const data = event.data;
            const txRef = data.tx_ref || "";
            const meta = data.meta || {};

            // Check if this payment is already processed
            const existingHistory = await PaymentHistory.findOne({ transactionId: data.id });
            if (existingHistory) {
                return res.json({ status: "already processed" });
            }

            // IS IT A SUBSCRIPTION?
            if (txRef.startsWith("sub_") || meta.planId) {
                const planId = meta.planId || data.plan;
                const userId = meta.userId;

                const plan = await Plan.findById(planId);
                const user = await User.findById(userId);

                if (plan && user) {
                    let subscription = await Subscription.findOne({ userId: user._id as any }).sort({ createdAt: -1 });

                    const endDate = new Date();
                    if (plan.interval === "monthly") {
                        endDate.setMonth(endDate.getMonth() + 1);
                    } else if (plan.interval === "yearly") {
                        endDate.setFullYear(endDate.getFullYear() + 1);
                    }

                    if (subscription) {
                        subscription.planId = plan._id as any;
                        subscription.tier = plan.name;
                        subscription.planName = plan.name;
                        subscription.flutterwavePlanId = plan.flutterwavePlanId;
                        subscription.price = plan.price;
                        subscription.currency = plan.currency;
                        subscription.interval = plan.interval;
                        subscription.features = plan.features;
                        subscription.startDate = new Date();
                        subscription.endDate = endDate;
                        subscription.status = "active";
                        subscription.isActive = true;
                        await subscription.save();
                    } else {
                        subscription = await Subscription.create({
                            userId: user._id as any,
                            planId: plan._id as any,
                            email: user.email,
                            tier: plan.name,
                            status: "active",
                            startDate: new Date(),
                            endDate: endDate,
                            planName: plan.name,
                            flutterwavePlanId: plan.flutterwavePlanId,
                            price: plan.price,
                            currency: plan.currency,
                            interval: plan.interval,
                            features: plan.features,
                            isActive: true,
                        });
                    }

                    await savePaymentHistory((user._id as any).toString(), "subscription", data.id, data.amount, data.currency, data.status, {
                        subscriptionId: subscription._id,
                        planId: plan._id,
                        planName: plan.name,
                        tier: plan.name,
                        txRef: data.tx_ref,
                    });

                    try {
                        const emailContent = subscriptionPaymentEmail(user.name, plan.name, data.amount, data.currency, data.id, subscription.startDate!, subscription.endDate!);
                        const htmlContent = subscriptionPaymentEmailHTML(user.name, plan.name, data.amount, data.currency, data.id, subscription.startDate!, subscription.endDate!);
                        await sendEmail({ to: user.email, subject: emailContent.subject, text: emailContent.text, html: htmlContent });
                    } catch (e) {
                        console.error("Webhook email error", e);
                    }
                }
            }

            // IS IT AN EVENT?
            if (txRef.startsWith("EVT-") || meta.eventId) {
                const eventId = meta.eventId;
                const userId = meta.userId;

                const ev = await Event.findById(eventId);
                const user = await User.findById(userId);

                if (ev && user) {
                    const userObjectId = new Types.ObjectId(userId);

                    if (!ev.registeredUsers.some((u) => u.equals(userObjectId))) {
                        ev.registeredUsers.push(userObjectId);
                    }

                    let paymentDate = new Date();
                    if (data.created_at) {
                        paymentDate = new Date(data.created_at);
                    }

                    ev.payments.push({
                        user: userObjectId,
                        transactionId: data.id,
                        amount: data.amount,
                        status: data.status,
                        date: paymentDate,
                    });

                    await ev.save();

                    await savePaymentHistory(userId, "event", data.id, data.amount, data.currency, data.status, {
                        eventId, eventTitle: ev.title
                    });

                    try {
                        const emailContent = eventPaymentEmail(user.name, ev.title, ev.date, ev.location, data.amount, data.currency, data.id);
                        const htmlContent = eventPaymentEmailHTML(user.name, ev.title, ev.date, ev.location, data.amount, data.currency, data.id, String(ev._id));
                        await sendEmail({ to: user.email, subject: emailContent.subject, text: emailContent.text, html: htmlContent });
                    } catch (e) {
                        console.error("Webhook email error", e);
                    }
                }
            }
        }

        return res.json({ status: "ok" });
    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).json({ error: "Webhook processing failed" });
    }
};
