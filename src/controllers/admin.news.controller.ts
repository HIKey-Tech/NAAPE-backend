import { Request, Response } from "express";
import News from "../models/News";
import Comment from "../models/Comment";
import mongoose from "mongoose";

// Get all news with filters and search
export const getAllNewsAdmin = async (req: Request, res: Response) => {
    try {
        const { 
            status, 
            category, 
            search, 
            sortBy = "createdAt", 
            order = "desc",
            page = 1,
            limit = 10
        } = req.query;

        const query: any = {};

        if (status) query.status = status;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const sortOrder = order === "asc" ? 1 : -1;

        const news = await News.find(query)
            .populate("author", "name email")
            .populate("lastEditedBy", "name email")
            .sort({ [sortBy as string]: sortOrder })
            .skip(skip)
            .limit(Number(limit));

        const total = await News.countDocuments(query);

        res.status(200).json({
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

// Get news analytics/stats
export const getNewsStats = async (_req: Request, res: Response) => {
    try {
        const totalNews = await News.countDocuments();
        const publishedNews = await News.countDocuments({ status: "published" });
        const draftNews = await News.countDocuments({ status: "draft" });
        
        const totalViews = await News.aggregate([
            { $group: { _id: null, total: { $sum: "$views" } } }
        ]);

        const totalComments = await Comment.countDocuments({ contentType: "news" });

        const newsByCategory = await News.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const recentNews = await News.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("author", "name email")
            .select("title status views createdAt category");

        const topViewedNews = await News.find({ status: "published" })
            .sort({ views: -1 })
            .limit(5)
            .populate("author", "name email")
            .select("title views createdAt category");

        res.status(200).json({
            overview: {
                totalNews,
                publishedNews,
                draftNews,
                totalViews: totalViews[0]?.total || 0,
                totalComments
            },
            byCategory: newsByCategory,
            recentNews,
            topViewedNews
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Update news
export const updateNews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, category, status, image } = req.body;
        const editorId = (req as any).user?.id;

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({ message: "News not found" });
        }

        const updateData: any = {
            lastEditedAt: new Date(),
            lastEditedBy: editorId
        };

        if (title) updateData.title = title;
        if (content) updateData.content = content;
        if (category) updateData.category = category;
        if (image) updateData.image = image;
        if (status) {
            updateData.status = status;
            if (status === "published" && !news.publishedAt) {
                updateData.publishedAt = new Date();
            }
        }

        const updatedNews = await News.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate("author", "name email").populate("lastEditedBy", "name email");

        res.status(200).json({
            message: "News updated successfully",
            data: updatedNews
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Delete news
export const deleteNews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({ message: "News not found" });
        }

        // Delete all comments associated with this news
        await Comment.deleteMany({ news: id, contentType: "news" });

        await News.findByIdAndDelete(id);

        res.status(200).json({ message: "News and associated comments deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get single news details for admin
export const getNewsDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const news = await News.findById(id)
            .populate("author", "name email")
            .populate("lastEditedBy", "name email");

        if (!news) {
            return res.status(404).json({ message: "News not found" });
        }

        const commentsCount = await Comment.countDocuments({ 
            news: id, 
            contentType: "news" 
        });

        res.status(200).json({
            ...news.toObject(),
            commentsCount
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get all comments for a news article (admin view)
export const getNewsCommentsAdmin = async (req: Request, res: Response) => {
    try {
        const { newsId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const comments = await Comment.find({ 
            news: newsId, 
            contentType: "news" 
        })
            .populate("user", "name email profilePicture")
            .populate("parentComment")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Comment.countDocuments({ 
            news: newsId, 
            contentType: "news" 
        });

        res.status(200).json({
            data: comments,
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

// Delete comment (admin)
export const deleteCommentAdmin = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Delete the comment and all its replies
        await Comment.deleteMany({
            $or: [
                { _id: commentId },
                { parentComment: commentId }
            ]
        });

        res.status(200).json({ message: "Comment and replies deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Bulk delete news
export const bulkDeleteNews = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Invalid news IDs" });
        }

        // Delete all comments for these news articles
        await Comment.deleteMany({ 
            news: { $in: ids }, 
            contentType: "news" 
        });

        const result = await News.deleteMany({ _id: { $in: ids } });

        res.status(200).json({ 
            message: `${result.deletedCount} news articles deleted successfully` 
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Bulk update status
export const bulkUpdateStatus = async (req: Request, res: Response) => {
    try {
        const { ids, status } = req.body;
        const editorId = (req as any).user?.id;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Invalid news IDs" });
        }

        if (!["draft", "published"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const updateData: any = {
            status,
            lastEditedAt: new Date(),
            lastEditedBy: editorId
        };

        if (status === "published") {
            updateData.publishedAt = new Date();
        }

        const result = await News.updateMany(
            { _id: { $in: ids } },
            updateData
        );

        res.status(200).json({ 
            message: `${result.modifiedCount} news articles updated successfully` 
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
