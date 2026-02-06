import mongoose from "mongoose";
import dotenv from "dotenv";
import ForumCategory from "../models/ForumCategory";
import { connectDB } from "../config/db";

dotenv.config();

const categories = [
    {
        name: "General Discussion",
        description: "General topics and conversations about aviation and aerospace",
        slug: "general-discussion",
        icon: "💬",
        order: 1,
    },
    {
        name: "Help & Support",
        description: "Get help from the community and ask questions",
        slug: "help-support",
        icon: "🆘",
        order: 2,
    },
    {
        name: "Announcements",
        description: "Official announcements and important updates",
        slug: "announcements",
        icon: "📢",
        order: 3,
    },
    {
        name: "Events & Meetups",
        description: "Discuss upcoming events, conferences, and meetups",
        slug: "events-meetups",
        icon: "📅",
        order: 4,
    },
    {
        name: "Career & Jobs",
        description: "Career advice, job opportunities, and professional development",
        slug: "career-jobs",
        icon: "💼",
        order: 5,
    },
    {
        name: "Technical Discussions",
        description: "In-depth technical discussions about aviation and aerospace",
        slug: "technical-discussions",
        icon: "🔧",
        order: 6,
    },
    {
        name: "Off-Topic",
        description: "Casual conversations and topics not related to aviation",
        slug: "off-topic",
        icon: "🎭",
        order: 7,
    },
];

const seedCategories = async () => {
    try {
        await connectDB();

        console.log("🌱 Seeding forum categories...");

        // Clear existing categories
        await ForumCategory.deleteMany({});
        console.log("✅ Cleared existing categories");

        // Insert new categories
        const createdCategories = await ForumCategory.insertMany(categories);
        console.log(`✅ Created ${createdCategories.length} categories:`);
        
        createdCategories.forEach((cat) => {
            console.log(`   ${cat.icon} ${cat.name} (${cat.slug})`);
        });

        console.log("\n🎉 Forum categories seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        process.exit(1);
    }
};

seedCategories();
