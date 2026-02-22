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

export const getAllNews = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const query: any = { status: "published" };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const news = await News.find(query)
            .populate("author", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await News.countDocuments(query);

        res.status(200).json({
            count: news.length,
            data: news,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
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
