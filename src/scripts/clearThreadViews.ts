import mongoose from "mongoose";
import ThreadView from "../models/ThreadView";
import dotenv from "dotenv";

dotenv.config();

const clearThreadViews = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("Connected to MongoDB");

        const result = await ThreadView.deleteMany({});
        console.log(`Deleted ${result.deletedCount} thread view records`);

        console.log("Thread views cleared successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error clearing thread views:", error);
        process.exit(1);
    }
};

clearThreadViews();
