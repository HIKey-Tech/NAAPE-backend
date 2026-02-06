import { Request, Response } from "express";
import ForumCategory from "../models/ForumCategory";
import ForumThread from "../models/ForumThread";
import ForumReply from "../models/ForumReply";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";
import { forumReplyNotificationEmailHTML } from "../utils/emailTemplatesHTML";

// ============ CATEGORIES ============

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await ForumCategory.find({ isActive: true }).sort({ order: 1 });
        
        // Get thread count for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const threadCount = await ForumThread.countDocuments({ category: category._id });
                return {
                    ...category.toObject(),
                    threadCount,
                };
            })
        );

        res.status(200).json({ data: categoriesWithCounts });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can create categories" });
        }

        const { name, description, slug, icon, order } = req.body;

        const category = await ForumCategory.create({
            name,
            description,
            slug,
            icon,
            order,
        });

        res.status(201).json({ message: "Category created", data: category });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ============ THREADS ============

export const getThreadsByCategory = async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const threads = await ForumThread.find({ category: categoryId })
            .populate("author", "name email role")
            .populate("category", "name slug")
            .sort({ isPinned: -1, lastActivity: -1 })
            .skip(skip)
            .limit(limit);

        // Get reply count for each thread
        const threadsWithCounts = await Promise.all(
            threads.map(async (thread) => {
                const replyCount = await ForumReply.countDocuments({ thread: thread._id });
                const lastReply = await ForumReply.findOne({ thread: thread._id })
                    .sort({ createdAt: -1 })
                    .populate("author", "name");
                
                return {
                    ...thread.toObject(),
                    replyCount,
                    lastReply,
                };
            })
        );

        const total = await ForumThread.countDocuments({ category: categoryId });

        res.status(200).json({
            data: threadsWithCounts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllThreads = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const skip = (page - 1) * limit;

        let query: any = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { content: { $regex: search, $options: "i" } },
                ],
            };
        }

        const threads = await ForumThread.find(query)
            .populate("author", "name email role")
            .populate("category", "name slug")
            .sort({ isPinned: -1, lastActivity: -1 })
            .skip(skip)
            .limit(limit);

        const threadsWithCounts = await Promise.all(
            threads.map(async (thread) => {
                const replyCount = await ForumReply.countDocuments({ thread: thread._id });
                const lastReply = await ForumReply.findOne({ thread: thread._id })
                    .sort({ createdAt: -1 })
                    .populate("author", "name");
                
                return {
                    ...thread.toObject(),
                    replyCount,
                    lastReply,
                };
            })
        );

        const total = await ForumThread.countDocuments(query);

        res.status(200).json({
            data: threadsWithCounts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getThreadById = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;

        const thread = await ForumThread.findById(threadId)
            .populate("author", "name email role")
            .populate("category", "name slug");

        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        // Increment view count
        thread.views += 1;
        await thread.save();

        const replyCount = await ForumReply.countDocuments({ thread: threadId });

        res.status(200).json({
            data: {
                ...thread.toObject(),
                replyCount,
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createThread = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, content, categoryId } = req.body;

        if (!title || !content || !categoryId) {
            return res.status(400).json({ message: "Title, content, and category are required" });
        }

        const category = await ForumCategory.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        const thread = await ForumThread.create({
            title,
            content,
            category: categoryId,
            author: userId,
        });

        const populatedThread = await ForumThread.findById(thread._id)
            .populate("author", "name email role")
            .populate("category", "name slug");

        res.status(201).json({ message: "Thread created", data: populatedThread });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;
        const { title, content } = req.body;

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        // Only author or admin can edit
        if (thread.author.toString() !== userId && userRole !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (title) thread.title = title;
        if (content) thread.content = content;
        await thread.save();

        const updatedThread = await ForumThread.findById(threadId)
            .populate("author", "name email role")
            .populate("category", "name slug");

        res.status(200).json({ message: "Thread updated", data: updatedThread });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        // Only author or admin can delete
        if (thread.author.toString() !== userId && userRole !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Delete all replies
        await ForumReply.deleteMany({ thread: threadId });
        
        // Delete thread
        await ForumThread.findByIdAndDelete(threadId);

        res.status(200).json({ message: "Thread deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const togglePinThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const userRole = (req as any).user.role;

        if (userRole !== "admin") {
            return res.status(403).json({ message: "Only admins can pin threads" });
        }

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        thread.isPinned = !thread.isPinned;
        await thread.save();

        res.status(200).json({ message: `Thread ${thread.isPinned ? "pinned" : "unpinned"}`, data: thread });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const toggleLockThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const userRole = (req as any).user.role;

        if (userRole !== "admin") {
            return res.status(403).json({ message: "Only admins can lock threads" });
        }

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        thread.isLocked = !thread.isLocked;
        await thread.save();

        res.status(200).json({ message: `Thread ${thread.isLocked ? "locked" : "unlocked"}`, data: thread });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ============ REPLIES ============

export const getRepliesByThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const replies = await ForumReply.find({ thread: threadId, parentReply: null })
            .populate("author", "name email role")
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit);

        // Get nested replies for each reply
        const repliesWithNested = await Promise.all(
            replies.map(async (reply) => {
                const nestedReplies = await ForumReply.find({ parentReply: reply._id })
                    .populate("author", "name email role")
                    .sort({ createdAt: 1 });
                
                return {
                    ...reply.toObject(),
                    replies: nestedReplies,
                };
            })
        );

        const total = await ForumReply.countDocuments({ thread: threadId, parentReply: null });

        res.status(200).json({
            data: repliesWithNested,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createReply = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { threadId } = req.params;
        const { content, parentReplyId } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }

        const thread = await ForumThread.findById(threadId).populate("author", "name email");
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        if (thread.isLocked) {
            return res.status(403).json({ message: "Thread is locked" });
        }

        const reply = await ForumReply.create({
            thread: threadId,
            author: userId,
            content,
            parentReply: parentReplyId || null,
        });

        // Update thread's last activity
        thread.lastActivity = new Date();
        await thread.save();

        const populatedReply = await ForumReply.findById(reply._id)
            .populate("author", "name email role");

        // Send email notification to thread author
        const replier = await User.findById(userId);
        const threadAuthor = thread.author as any;
        
        if (replier && threadAuthor && threadAuthor._id.toString() !== userId.toString()) {
            try {
                await sendEmail({
                    to: threadAuthor.email,
                    subject: `New Reply on Your Thread: ${thread.title}`,
                    text: `${replier.name} replied to your thread "${thread.title}".\n\nReply: ${content}`,
                    html: forumReplyNotificationEmailHTML(
                        threadAuthor.name,
                        thread.title,
                        replier.name,
                        content,
                        threadId
                    ),
                });
            } catch (emailError) {
                console.error("Failed to send reply notification:", emailError);
            }
        }

        res.status(201).json({ message: "Reply added", data: populatedReply });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateReply = async (req: Request, res: Response) => {
    try {
        const { replyId } = req.params;
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;
        const { content } = req.body;

        const reply = await ForumReply.findById(replyId);
        if (!reply) {
            return res.status(404).json({ message: "Reply not found" });
        }

        // Only author or admin can edit
        if (reply.author.toString() !== userId && userRole !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        reply.content = content;
        reply.isEdited = true;
        reply.editedAt = new Date();
        await reply.save();

        const updatedReply = await ForumReply.findById(replyId)
            .populate("author", "name email role");

        res.status(200).json({ message: "Reply updated", data: updatedReply });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteReply = async (req: Request, res: Response) => {
    try {
        const { replyId } = req.params;
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;

        const reply = await ForumReply.findById(replyId);
        if (!reply) {
            return res.status(404).json({ message: "Reply not found" });
        }

        // Only author or admin can delete
        if (reply.author.toString() !== userId && userRole !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Delete nested replies
        await ForumReply.deleteMany({ parentReply: replyId });
        
        // Delete reply
        await ForumReply.findByIdAndDelete(replyId);

        res.status(200).json({ message: "Reply deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
