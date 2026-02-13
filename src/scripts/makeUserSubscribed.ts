import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";
import { Subscription } from "../models/Subscription";
import { Plan } from "../models/Plan";

dotenv.config();

const makeUserSubscribed = async (email: string) => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            console.error(`❌ User with email ${email} not found`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);

        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
            userId: user._id,
            status: "active",
        });

        if (existingSubscription) {
            console.log("⚠️  User already has an active subscription");
            console.log("Subscription details:", {
                tier: existingSubscription.tier,
                status: existingSubscription.status,
                startDate: existingSubscription.startDate,
                endDate: existingSubscription.endDate,
            });
            process.exit(0);
        }

        // Find or create the basic plan (15,000 Naira)
        let plan = await Plan.findOne({ name: "basic" });
        
        if (!plan) {
            console.log("📝 Creating basic plan...");
            plan = await Plan.create({
                name: "basic",
                flutterwavePlanId: "test-plan-basic",
                price: 15000,
                currency: "NGN",
                interval: "monthly",
                features: [
                    "Access to member dashboard",
                    "Forum participation",
                    "Event registration",
                    "Publication submission",
                    "News and updates",
                ],
                isActive: true,
            });
            console.log("✅ Basic plan created");
        }

        // Create subscription
        const startDate = new Date();
        const endDate = new Date();
        
        // Set end date based on plan interval
        if (plan.interval === "monthly") {
            endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
        } else if (plan.interval === "yearly") {
            endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription
        } else {
            endDate.setMonth(endDate.getMonth() + 1); // Default to 1 month
        }

        // Generate unique test subscription ID to avoid duplicate key error
        const testSubscriptionId = `test-sub-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const subscription = await Subscription.create({
            userId: user._id,
            planId: plan._id,
            flutterwaveSubscriptionId: testSubscriptionId, // Unique test ID
            email: user.email,
            tier: "basic",
            status: "active",
            startDate,
            endDate,
            planName: plan.name,
            flutterwavePlanId: plan.flutterwavePlanId,
            price: plan.price,
            currency: plan.currency,
            interval: plan.interval,
            features: plan.features,
            isActive: true,
        });

        console.log("✅ Subscription created successfully!");
        console.log("Subscription details:", {
            userId: subscription.userId,
            email: subscription.email,
            tier: subscription.tier,
            status: subscription.status,
            price: subscription.price,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

// Get email from command line argument or use default
const email = process.argv[2] || "davidaiyewumi1@gmail.com";
makeUserSubscribed(email);
