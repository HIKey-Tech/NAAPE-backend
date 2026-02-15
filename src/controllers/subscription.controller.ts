import { Request, Response } from "express";
import { flw } from "../utils/flw.client";
import { savePaymentHistory } from "../utils/savePaymentHistory";
import { Subscription } from "../models/Subscription";
import { Plan } from "../models/Plan";
import PaymentHistory from "../models/PaymentHistory";
import sendEmail from "../utils/sendEmail";
import { subscriptionPaymentEmail } from "../utils/emailTemplates";
import { subscriptionPaymentEmailHTML } from "../utils/emailTemplatesHTML";
import User from "../models/User";

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
        console.log("=== SUBSCRIPTION PAYMENT INITIALIZATION ===");
        console.log("Request body:", req.body);
        console.log("User:", req.user ? { id: req.user._id, email: req.user.email, name: req.user.name } : "No user");

        const user = req.user;
        if (!user) {
            console.log("❌ No user found in request");
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { tier } = req.body;
        console.log("Tier requested:", tier);

        if (!tier || !["free", "premium"].includes(tier)) {
            console.log("❌ Invalid tier:", tier);
            return res.status(400).json({ error: "Invalid subscription tier" });
        }

        console.log("🔍 Looking for plan with name:", tier);
        const plan = await Plan.findOne({ name: tier, isActive: true });
        console.log("Plan found:", plan ? { id: plan._id, name: plan.name, price: plan.price } : "No plan found");
        
        if (!plan) {
            console.log("❌ Plan not found for tier:", tier);
            return res.status(404).json({ error: "Subscription plan not found" });
        }

        // Handle free tier - no payment needed
        if (tier === "free") {
            console.log("✅ Processing free tier subscription");
            try {
                // Check if user already has an active subscription
                let subscription = await Subscription.findOne({
                    userId: user._id,
                    status: "active"
                });
                console.log("Existing subscription:", subscription ? "Found" : "None");

                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 1);

                if (subscription) {
                    console.log("📝 Updating existing subscription to free");
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
                    await subscription.save();
                } else {
                    console.log("🆕 Creating new free subscription");
                    subscription = await Subscription.create({
                        userId: user._id,
                        planId: plan._id,
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

                console.log("✅ Free subscription created/updated successfully");
                return res.json({
                    success: true,
                    message: "Free subscription activated successfully",
                    subscription: {
                        tier: subscription.tier,
                        startDate: subscription.startDate,
                        endDate: subscription.endDate,
                    }
                });
            } catch (freeError) {
                console.error("❌ Error processing free subscription:", freeError);
                throw freeError;
            }
        }

        // Handle premium tier - payment required
        console.log("💳 Processing premium tier subscription");
        const redirectUrl = process.env.FLW_REDIRECT_URL;
        console.log("Redirect URL:", redirectUrl);
        
        if (!redirectUrl) {
            console.log("❌ FLW_REDIRECT_URL not set");
            return res.status(500).json({ error: "FLW_REDIRECT_URL not set" });
        }

        const txRef = `sub_${user._id}_${Date.now()}`;
        console.log("Transaction reference:", txRef);

        const paymentPayload = {
            tx_ref: txRef,
            amount: plan.price,
            currency: plan.currency,
            redirect_url: redirectUrl,
            customer: {
                email: user.email,
                name: user.name,
                phone_number: user.phone || "",
            },
            customizations: {
                title: `${plan.name} Subscription`,
                description: "Recurring subscription payment",
            },
            meta: {
                planId: plan._id,
                userId: user._id,
                tier: plan.name
            }
        };

        console.log("💰 Payment payload:", JSON.stringify(paymentPayload, null, 2));

        console.log("🌐 Making Flutterwave API call...");
        const response = await flw.post("/payments", paymentPayload);
        console.log("✅ Flutterwave response status:", response.status);
        console.log("✅ Flutterwave response data:", JSON.stringify(response.data, null, 2));

        return res.json({
            checkoutUrl: response.data.data.link,
            txRef,
        });
    } catch (err: any) {
        console.error("=== SUBSCRIPTION PAYMENT ERROR ===");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        
        if (err.response) {
            console.error("Error response status:", err.response.status);
            console.error("Error response data:", JSON.stringify(err.response.data, null, 2));
        }
        
        return res.status(500).json({ 
            error: "Payment initialization failed", 
            details: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
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

/**
 * Verify subscription payment after Flutterwave redirect
 * GET /api/payments/subscription/verify?transaction_id=xxx
 */
export const verifySubscriptionPayment = async (req: Request, res: Response) => {
    try {
        const transaction_id = req.query.transaction_id as string;
        const user = req.user;

        if (!transaction_id) {
            return res.status(400).json({ 
                status: "failed", 
                message: "Missing transaction_id" 
            });
        }

        if (!user) {
            return res.status(401).json({ 
                status: "failed", 
                message: "Unauthorized" 
            });
        }

        // Verify with Flutterwave
        const fwRes = await flw.get(`/transactions/${transaction_id}/verify`);
        const data = fwRes?.data?.data;

        if (!data || data.status !== "successful") {
            return res.status(400).json({ 
                status: "failed",
                message: "Payment verification failed" 
            });
        }

        // Extract tx_ref to get user and tier info
        const txRef = data.tx_ref;
        
        // Check if subscription already exists for this transaction
        const existingHistory = await PaymentHistory.findOne({ 
            transactionId: data.id 
        });
        
        if (existingHistory) {
            return res.json({ 
                status: "successful",
                message: "Payment already processed",
                alreadyProcessed: true
            });
        }

        // Find the plan based on the amount paid
        const plan = await Plan.findOne({ 
            price: data.amount,
            isActive: true 
        });

        if (!plan) {
            return res.status(404).json({ 
                status: "failed",
                message: "Plan not found for this payment amount" 
            });
        }

        // Check if user already has an active subscription
        let subscription = await Subscription.findOne({
            userId: user._id,
            status: "active"
        });

        if (subscription) {
            // Update existing subscription
            subscription.planId = plan._id as any;
            subscription.tier = plan.name;
            subscription.planName = plan.name;
            subscription.flutterwavePlanId = plan.flutterwavePlanId;
            subscription.price = plan.price;
            subscription.currency = plan.currency;
            subscription.interval = plan.interval;
            subscription.features = plan.features;
            subscription.startDate = new Date();
            
            // Calculate end date based on interval
            const endDate = new Date();
            if (plan.interval === "monthly") {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (plan.interval === "yearly") {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            subscription.endDate = endDate;
            
            await subscription.save();
        } else {
            // Create new subscription
            const endDate = new Date();
            if (plan.interval === "monthly") {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (plan.interval === "yearly") {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            subscription = await Subscription.create({
                userId: user._id,
                planId: plan._id,
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

        // Save payment history
        await savePaymentHistory(
            user._id.toString(),
            "subscription",
            data.id,
            data.amount,
            data.currency,
            data.status,
            {
                subscriptionId: subscription._id,
                planId: plan._id,
                planName: plan.name,
                tier: plan.name,
                txRef: data.tx_ref,
            }
        );

        // Send confirmation email
        try {
            const emailContent = subscriptionPaymentEmail(
                user.name,
                plan.name,
                data.amount,
                data.currency,
                data.id,
                subscription.startDate!,
                subscription.endDate!
            );

            const htmlContent = subscriptionPaymentEmailHTML(
                user.name,
                plan.name,
                data.amount,
                data.currency,
                data.id,
                subscription.startDate!,
                subscription.endDate!
            );

            await sendEmail({
                to: user.email,
                subject: emailContent.subject,
                text: emailContent.text,
                html: htmlContent,
            });
        } catch (emailError) {
            console.error("Failed to send subscription confirmation email:", emailError);
            // Don't fail the request if email fails
        }

        return res.json({ 
            status: "successful",
            message: "Subscription activated successfully",
            subscription: {
                tier: subscription.tier,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
            }
        });

    } catch (err: any) {
        console.error("Verify subscription payment error:", err);
        return res.status(500).json({ 
            status: "failed",
            message: "Payment verification failed",
            error: err.message 
        });
    }
};

/**
 * Test endpoint to debug subscription issues
 * GET /api/subscription/debug
 */
export const debugSubscription = async (req: Request, res: Response) => {
    try {
        console.log("=== SUBSCRIPTION DEBUG ===");
        
        // Check if user is authenticated
        const user = req.user;
        console.log("User:", user ? { id: user._id, email: user.email, name: user.name } : "No user");
        
        // Check if plans exist
        const plans = await Plan.find({});
        console.log("All plans in database:", plans);
        
        // Check active plans
        const activePlans = await Plan.find({ isActive: true });
        console.log("Active plans:", activePlans);
        
        // Check environment variables
        const envVars = {
            FLW_REDIRECT_URL: process.env.FLW_REDIRECT_URL,
            FLW_SECRET_KEY: process.env.FLW_SECRET_KEY ? "SET" : "NOT SET",
            FLW_PUBLIC_KEY: process.env.FLW_PUBLIC_KEY ? "SET" : "NOT SET",
        };
        console.log("Environment variables:", envVars);
        
        return res.json({
            success: true,
            user: user ? { id: user._id, email: user.email, name: user.name } : null,
            plans: plans,
            activePlans: activePlans,
            envVars: envVars
        });
        
    } catch (error: any) {
        console.error("Debug error:", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Get current user's subscription status
 * GET /api/subscription/status
 */
export const getSubscriptionStatus = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const subscription = await Subscription.findOne({
            userId: user._id,
            status: "active",
        }).populate("planId");

        if (!subscription) {
            return res.json({
                hasSubscription: false,
                status: "none",
                tier: null,
                message: "No active subscription"
            });
        }

        // Check if subscription has expired
        if (subscription.endDate && new Date() > subscription.endDate) {
            subscription.status = "cancelled";
            await subscription.save();
            
            return res.json({
                hasSubscription: false,
                status: "expired",
                tier: null,
                message: "Subscription has expired"
            });
        }

        return res.json({
            hasSubscription: true,
            status: subscription.status,
            tier: subscription.tier,
            planName: subscription.planName,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            features: subscription.features,
            interval: subscription.interval,
        });

    } catch (err: any) {
        console.error("Get subscription status error:", err);
        return res.status(500).json({ 
            error: "Failed to fetch subscription status" 
        });
    }
};


