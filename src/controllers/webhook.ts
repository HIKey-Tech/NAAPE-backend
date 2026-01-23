import { Request, Response } from "express";
import { Subscription } from "../models/Subscription";
import { savePaymentHistory } from "../utils/savePaymentHistory";

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

        return res.json({ status: "ok" });
    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).json({ error: "Webhook processing failed" });
    }
};
