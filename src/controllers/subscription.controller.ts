import { Request, Response } from "express";
import { flw } from "../utils/flw.client";
import { savePaymentHistory } from "../utils/savePaymentHistory";
import { Subscription } from "../models/Subscription";
import { Plan } from "../models/Plan";

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

/* -------------------------------------------------------------------------- */
/*                            CREATE A SUBSCRIPTION                            */
/* -------------------------------------------------------------------------- */

// export const createSubscription = async (req: Request, res: Response) => {
//     try {
//         const { tier } = req.body;

//         if (!tier || !["basic", "premium"].includes(tier)) {
//             return res.status(400).json({ error: "Invalid subscription tier" });
//         }

//         const user = req.user;
//         if (!user) return res.status(401).json({ error: "Unauthorized" });

//         // Find plan
//         const plan = await Plan.findOne({ name: tier, isActive: true });
//         if (!plan) return res.status(404).json({ error: "Subscription plan not found" });

//         // Create DB subscription first (Flutterwave subscription/payment will be initialized later)
//         const subscription = await Subscription.create({
//             userId: user._id,
//             planId: plan._id,
//             tier: plan.name,
//             email: user.email,
//             status: "pending",
//             planName: plan.name,
//             flutterwavePlanId: plan.flutterwavePlanId,
//             price: plan.price,
//             currency: plan.currency,
//             interval: plan.interval,
//             features: plan.features,
//             isActive: plan.isActive,
//         });

//         return res.status(201).json({
//             message: "Subscription created. Complete payment to activate.",
//             subscription,
//         });
//     } catch (err: any) {
//         console.error(err?.response?.data || err.message);
//         return res.status(500).json({ error: "create subscription failed" });
//     }
// };

/**
 * Initialize subscription payment
 * POST /api/subscriptions/initialize-payment
 * { subscriptionId }
 */
export const initializeSubscriptionPayment = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const { tier } = req.body;

        if (!tier || !["basic", "premium"].includes(tier)) {
            return res.status(400).json({ error: "Invalid subscription tier" });
        }

        const plan = await Plan.findOne({ name: tier, isActive: true });
        if (!plan) {
            return res.status(404).json({ error: "Subscription plan not found" });
        }

        const redirectUrl = process.env.FLW_REDIRECT_URL;
        if (!redirectUrl) {
            return res.status(500).json({ error: "FLW_REDIRECT_URL not set" });
        }

        const txRef = `sub_${user._id}_${Date.now()}`;

        const response = await flw.post("/payments", {
            tx_ref: txRef,
            amount: plan.price,
            currency: plan.currency,
            redirect_url: redirectUrl,
            payment_plan: plan.flutterwavePlanId,
            customer: {
                email: user.email,
                name: user.name,
                phone_number: user.phone,
            },
            customizations: {
                title: `${plan.name} Subscription`,
                description: "Recurring subscription payment",
            },
        });

        return res.json({
            checkoutUrl: response.data.data.link,
            txRef,
        });
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "Payment initialization failed" });
    }
};


/* -------------------------------------------------------------------------- */
/*                           LIST SUBSCRIPTIONS                                */
/* -------------------------------------------------------------------------- */

export const listSubscriptions = async (req: Request, res: Response) => {
    try {
        const { status, tier } = req.query;

        const filter: any = {};
        if (status) filter.status = status;
        if (tier) filter.tier = tier;

        const subscriptions = await Subscription.find(filter)
            .populate("userId", "name email")
            .populate("planId", "name price interval")
            .sort({ createdAt: -1 });

        res.json(subscriptions);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
};

export const cancelSubscriptionAdmin = async (req: Request, res: Response) => {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
    }

    subscription.status = "cancelled";
    subscription.endDate = new Date();
    await subscription.save();

    res.json({ message: "Subscription cancelled" });
};


// FOR ADMINS ONLY: CREATE A SUBSCRIPTION PLAN


export async function createSubscriptionPlan(req: Request, res: Response) {
    const {
        name,
        flutterwavePlanId,
        price,
        currency = "NGN",
        interval = "monthly",
        features = [],
    } = req.body;

    if (!name || !flutterwavePlanId || !price) {
        return res.status(400).json({
            code: "VALIDATION_ERROR",
            message: "Missing required fields",
        });
    }

    const existing = await Plan.findOne({ name });
    if (existing) {
        return res.status(409).json({
            code: "PLAN_EXISTS",
            message: "Plan already exists",
        });
    }

    const plan = await Plan.create({
        name,
        flutterwavePlanId,
        price,
        currency,
        interval,
        features,
        isActive: true,
    });

    res.status(201).json(plan);
}



/**
 * Get all subscription plans
 * Public: Anyone can fetch available plans
 */
export async function getAllPlans(req: Request, res: Response) {
    try {
        const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
        res.status(200).json({
            message: "Plans fetched successfully",
            count: plans.length,
            data: plans,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch plans" });
    }
}


