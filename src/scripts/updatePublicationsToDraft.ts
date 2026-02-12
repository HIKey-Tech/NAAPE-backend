import mongoose from "mongoose";
import Publication from "../models/Publication";
import dotenv from "dotenv";

dotenv.config();

const updatePublicationsToDraft = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/naape";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Update all pending publications to draft (for testing)
        // You can modify the filter to target specific publications
        const result = await Publication.updateMany(
            { status: "pending" }, // Filter: only pending publications
            { $set: { status: "draft" } } // Update: set status to draft
        );

        console.log(`✅ Updated ${result.modifiedCount} publications to draft status`);

        // Disconnect
        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating publications:", error);
        process.exit(1);
    }
};

updatePublicationsToDraft();
