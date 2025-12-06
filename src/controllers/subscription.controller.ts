import { Request, Response } from "express";
import { flw } from "../utils/flw.client";

/**
 * Create a plan
 * POST /api/plans
 * { name, amount, interval, duration } 
 */
export const createPlan = async (req: Request, res: Response) => {
    try {
        const { name, amount, interval = "monthly", duration = 12 } = req.body;
        const r = await flw.post("/payment-plans", {
            name,
            amount,
            interval,
            duration,
        });
        return res.json(r.data);
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
        return res.json(r.data);
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "create subscription failed" });
    }
};
