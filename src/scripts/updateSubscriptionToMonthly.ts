import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";
import { Subscription } from "../models/Subscription";
import { Plan } from "../models/Plan";

dotenv.config();

const updateSubscriptionToMonthly = async (email: string) => {
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

        // Find the user's active subscription
        const subscription = await Subscription.findOne({
            userId: user._id,
            status: "active",
        });

        if (!subscription) {
            console.log("❌ No active subscription found for this user");
            process.exit(1);
        }

        console.log("📝 Current subscription details:", {
            tier: subscription.tier,
            interval: subscription.interval,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
        });

        // Update the plan to monthly if it exists
        const plan = await Plan.findOne({ name: "basic" });
        if (plan && plan.interval !== "monthly") {
            plan.interval = "monthly";
            await plan.save();
            console.log("✅ Updated plan interval to monthly");
        }

        // Update subscription to monthly
        subscription.interval = "monthly";
        
        // Recalculate end date to be 1 month from start date
        const newEndDate = new Date(subscription.startDate!);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        subscription.endDate = newEndDate;

        await subscription.save();

        console.log("✅ Subscription updated successfully!");
        console.log("📝 New subscription details:", {
            tier: subscription.tier,
            interval: subscription.interval,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            daysRemaining: Math.ceil((newEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

// Get email from command line argument or use default
const email = process.argv[2] || "davidaiyewumi1@gmail.com";
updateSubscriptionToMonthly(email);
