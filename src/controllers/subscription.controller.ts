import { Request, Response } from "express";
import { flw } from "../utils/flw.client";
import { savePaymentHistory } from "../utils/savePaymentHistory";

/**
 * Create a plan
 * POST /api/plans
 * { name, amount, interval, duration } 
 */
export const createPlan = async (req: Request, res: Response) => {
    try {
        const { name, amount, interval = "monthly", duration = 12, customer_email, customer_name, customer_phone } = req.body;
        // Create the payment plan with Flutterwave
        const planResponse = await flw.post("/payment-plans", {
            name,
            amount,
            interval,
            duration,
        });

        // Save payment history only if the plan is successfully created and relevant fields exist
        if (planResponse?.data?.status === "success" && planResponse?.data?.data) {
            await savePaymentHistory(
                customer_email || "", // No customer ID for plan, so fallback to email if present
                "subscription",
                planResponse.data.data.id || "", // Plan ID as transactionId
                planResponse.data.data.amount || 0,
                planResponse.data.data.currency || "NGN",
                planResponse.data.data.status || "active",
                {
                    planId: planResponse.data.data.id || "",
                    customerName: customer_name || "",
                    customerPhone: customer_phone || ""
                }
            );
        }
        return res.json(planResponse.data);
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "create plan failed" });
    }
};

/**
 * Create a subscription for an already-created plan
 * POST /api/subscriptions
 * { customer_email, plan_id, currency = "NGN", customer_phone, customer_name }
 */

export const createSubscription = async (req: Request, res: Response) => {
    try {
        const { plan_id, customer_email, customer_name, customer_phone } = req.body;
        const r = await flw.post("/subscriptions", {
            plan: plan_id,
            customer: {
                email: customer_email,
                name: customer_name,
                phone_number: customer_phone,
            },
        });

        // Save payment history upon successful subscription creation
        if (r?.data?.status === "success" && r?.data?.data) {
            await savePaymentHistory(
                r.data.data.customer?.id || customer_email, // Use customer ID if available, otherwise email
                "subscription",
                r.data.data.id || "", // transactionId, fallback to "" if not present
                r.data.data.amount || 0,
                r.data.data.currency || "NGN",
                r.data.data.status || "active",
                {
                    planId: plan_id,
                    customerName: customer_name,
                    customerPhone: customer_phone
                }
            );
        }

        return res.json(r.data);
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "create subscription failed" });
    }
};
