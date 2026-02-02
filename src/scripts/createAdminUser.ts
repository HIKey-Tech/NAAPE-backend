import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User";

dotenv.config();

const createAdminUser = async () => {
    try {
        // Connect to database
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI not found in environment variables");
        }

        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: "testadmin@email.com" });
        
        if (existingAdmin) {
            console.log("⚠️  Admin user already exists with email: testadmin@email.com");
            console.log("User details:", {
                name: existingAdmin.name,
                email: existingAdmin.email,
                role: existingAdmin.role,
            });
            process.exit(0);
        }

        // Create admin user
        const adminUser = await User.create({
            name: "Admin Ahmed",
            email: "testadmin@email.com",
            password: "admin2026@Naape", // Will be hashed by the pre-save hook
            role: "admin",
            isVerified: true,
            profile: {
                specialization: "System Administrator",
                bio: "NAAPE System Administrator",
                organization: "NAAPE",
            },
        });

        console.log("✅ Admin user created successfully!");
        console.log("User details:", {
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
            id: adminUser._id,
        });
        console.log("\n📝 Login credentials:");
        console.log("Email: testadmin@email.com");
        console.log("Password: admin2026@Naape");

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error creating admin user:", error.message);
        process.exit(1);
    }
};

createAdminUser();
