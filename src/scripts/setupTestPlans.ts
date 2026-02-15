import mongoose from "mongoose";
import { Plan } from "../models/Plan";
import dotenv from "dotenv";

dotenv.config();

const setupTestPlans = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/naape");
        console.log("✅ Connected to MongoDB");

        // Clear existing plans
        await Plan.deleteMany({});
        console.log("🗑️ Cleared existing plans");

        // Create free plan (no payment required)
        const freePlan = await Plan.create({
            name: "free",
            flutterwavePlanId: "free_plan", // Not used for free tier
            price: 0,
            currency: "NGN",
            interval: "monthly",
            features: [
                "Basic access to platform",
                "Limited features",
                "Community support"
            ],
            isActive: true,
        });

        // Create premium plan with reduced pricing for testing
        const premiumPlan = await Plan.create({
            name: "premium",
            flutterwavePlanId: "premium_test_plan", // This would normally come from Flutterwave
            price: 100, // Reduced to 100 naira for testing
            currency: "NGN",
            interval: "monthly",
            features: [
                "Full platform access",
                "Advanced analytics",
                "Priority support",
                "Export & integrations",
                "Custom reports",
                "API access",
                "Premium content"
            ],
            isActive: true,
        });

        console.log("✅ Created plans:");
        console.log("Free plan:", `₦${freePlan.price}/month (Free)`);
        console.log("Premium plan:", `₦${premiumPlan.price}/month`);

        console.log("\n📋 Plan details:");
        console.log("Free features:", freePlan.features);
        console.log("Premium features:", premiumPlan.features);

        await mongoose.disconnect();
        console.log("✅ Database connection closed");
        
    } catch (error) {
        console.error("❌ Error setting up test plans:", error);
        process.exit(1);
    }
};

setupTestPlans();