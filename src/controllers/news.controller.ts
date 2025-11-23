import { Request, Response } from "express";
import News from "../models/News";

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
