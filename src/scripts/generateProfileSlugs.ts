import mongoose from "mongoose";
import User from "../models/User";
import dotenv from "dotenv";

dotenv.config();

const generateProfileSlugs = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Find all users without a profileSlug
        const usersWithoutSlug = await User.find({ 
            $or: [
                { profileSlug: { $exists: false } },
                { profileSlug: null },
                { profileSlug: "" }
            ]
        });

        console.log(`📊 Found ${usersWithoutSlug.length} users without profile slugs`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of usersWithoutSlug) {
            try {
                // Generate slug using the model method
                user.profileSlug = await user.generateProfileSlug();
                await user.save();
                console.log(`✅ Generated slug for ${user.name}: ${user.profileSlug}`);
                successCount++;
            } catch (error: any) {
                console.error(`❌ Error generating slug for ${user.name}:`, error.message);
                errorCount++;
            }
        }

        console.log("\n📈 Migration Summary:");
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📊 Total: ${usersWithoutSlug.length}`);

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB");
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Migration failed:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

generateProfileSlugs();
