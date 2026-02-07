import { Request, Response } from "express";
import Comment from "../models/Comment";
import Publication from "../models/Publication";
import News from "../models/News";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";
import { commentNotificationEmailHTML } from "../utils/emailTemplatesHTML";

export const addComment = async (req: Request, res: Response) => {
    try {
        const { publicationId } = req.params;
        const { text } = req.body;

        const userId = (req as any).user.id;

        if (!text) {
            return res.status(400).json({ message: "Comment cannot be empty" });
        }

        const comment = await Comment.create({
            publication: publicationId,
            contentType: "publication",
            user: userId,
            text,
        });

        // Get publication and author details
        const publication = await Publication.findById(publicationId).populate("author", "name email");
        const commenter = await User.findById(userId);

        // Send email notification to publication author
        if (publication && commenter) {
            const author = publication.author as any;
            // Only send if commenter is not the author
            if (author && author._id.toString() !== userId.toString()) {
                try {
                    await sendEmail({
                        to: author.email,
                        subject: "New Comment on Your Publication",
                        text: `Dear ${author.name},\n\n${commenter.name} has commented on your publication "${publication.title}".\n\nComment: "${text}"\n\nBest regards,\nThe NAAPE Team`,
                        html: commentNotificationEmailHTML(
                            author.name,
                            publication.title,
                            commenter.name,
                            text,
                            publicationId
                        )
                    });
                } catch (emailError) {
                    console.error("Failed to send comment notification:", emailError);
                }
            }
        }

        res.status(201).json({
            message: "Comment added",
            data: comment,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const addNewsComment = async (req: Request, res: Response) => {
    try {
        const { newsId } = req.params;
        const { text } = req.body;

        const userId = (req as any).user.id;

        if (!text) {
            return res.status(400).json({ message: "Comment cannot be empty" });
        }

        const comment = await Comment.create({
            news: newsId,
            contentType: "news",
            user: userId,
            text,
        });

        // Populate the comment with user details before returning
        await comment.populate("user", "name email role");

        res.status(201).json({
            message: "Comment added",
            data: comment,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getComments = async (req: Request, res: Response) => {
    try {
        const { publicationId } = req.params;

        const comments = await Comment.find({ 
            publication: publicationId,
            contentType: "publication"
        })
            .populate("user", "name email role")
            .sort({ createdAt: -1 });

        res.status(200).json({ data: comments });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNewsComments = async (req: Request, res: Response) => {
    try {
        const { newsId } = req.params;

        const comments = await Comment.find({ 
            news: newsId,
            contentType: "news"
        })
            .populate("user", "name email role")
            .sort({ createdAt: -1 });

        res.status(200).json({ data: comments });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteComment = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;
        const user = (req as any).user;

        const comment = await Comment.findById(commentId);

        if (!comment) return res.status(404).json({ message: "Not found" });

        // Allow delete if admin or comment owner
        if (comment.user.toString() !== user.id && user.role !== "admin") {
            return res.status(403).json({ message: "Not allowed" });
        }

        await Comment.findByIdAndDelete(commentId);

        res.status(200).json({ message: "Comment deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
