import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Fix the subscription index issue
 * This script drops the old unique index on flutterwaveSubscriptionId
 * and recreates it with sparse: true to allow multiple null values
 */
async function fixSubscriptionIndex() {
    try {
        console.log("🔧 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("✅ Connected to MongoDB");

        const db = mongoose.connection.db;
        const subscriptionsCollection = db?.collection("subscriptions");

        if (!subscriptionsCollection) {
            throw new Error("Subscriptions collection not found");
        }

        console.log("\n📋 Current indexes:");
        const indexes = await subscriptionsCollection.indexes();
        console.log(JSON.stringify(indexes, null, 2));

        // Drop the problematic index if it exists
        try {
            console.log("\n🗑️  Dropping old flutterwaveSubscriptionId_1 index...");
            await subscriptionsCollection.dropIndex("flutterwaveSubscriptionId_1");
            console.log("✅ Old index dropped");
        } catch (error: any) {
            if (error.code === 27 || error.message.includes("index not found")) {
                console.log("ℹ️  Index doesn't exist, skipping drop");
            } else {
                throw error;
            }
        }

        // Create new sparse unique index
        console.log("\n🔨 Creating new sparse unique index...");
        await subscriptionsCollection.createIndex(
            { flutterwaveSubscriptionId: 1 },
            { unique: true, sparse: true }
        );
        console.log("✅ New sparse index created");

        console.log("\n📋 Updated indexes:");
        const newIndexes = await subscriptionsCollection.indexes();
        console.log(JSON.stringify(newIndexes, null, 2));

        console.log("\n✅ Index fix completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error fixing subscription index:", error);
        process.exit(1);
    }
}

fixSubscriptionIndex();
