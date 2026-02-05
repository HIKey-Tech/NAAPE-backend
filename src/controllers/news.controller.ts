import { Request, Response } from "express";
import News from "../models/News";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";
import { newNewsNotificationEmailHTML } from "../utils/emailTemplatesHTML";

// Admin: Create News
export const createNews = async (req: Request, res: Response) => {
    try {
        const { title, content, category, image: imageUrl } = req.body;
        const authorId = (req as any).user?.id;
        const image = (req as any).file?.path || imageUrl || null;

        const news = await News.create({
            title,
            content,
            category,
            image,
            author: authorId
        });

        // Notify all members about new news
        try {
            const members = await User.find({ role: { $in: ["member", "editor", "admin"] } }).limit(100);
            for (const member of members) {
                try {
                    await sendEmail({
                        to: member.email,
                        subject: "Latest News from NAAPE",
                        text: `Dear ${member.name},\n\nNew content has been published: "${title}".\n\nVisit NAAPE to read more.\n\nBest regards,\nThe NAAPE Team`,
                        html: newNewsNotificationEmailHTML(
                            member.name,
                            title,
                            category,
                            String(news._id)
                        )
                    });
                } catch (emailError) {
                    console.error(`Failed to send news notification to ${member.email}:`, emailError);
                }
            }
        } catch (error) {
            console.error("Failed to notify members about news:", error);
        }

        res.status(201).json({
            message: "News created successfully.",
            data: news,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Public: Get all news
export const getAllNews = async (_req: Request, res: Response) => {
    try {
        const news = await News.find().populate("author", "name email");

        res.status(200).json({
            count: news.length,
            data: news
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Public: Get a single news article
export const getSingleNews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const news = await News.findById(id).populate("author", "name email");
        if (!news) return res.status(404).json({ message: "News not found" });

        res.status(200).json(news);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
