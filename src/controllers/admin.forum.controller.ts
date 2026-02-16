import { Request, Response } from "express";
import ForumCategory from "../models/ForumCategory";
import ForumThread from "../models/ForumThread";
import ForumReply from "../models/ForumReply";
import ForumReport from "../models/ForumReport";
import UserForumBan from "../models/UserForumBan";
import ThreadApproval from "../models/ThreadApproval";
import User from "../models/User";
import Notification from "../models/Notification";
import mongoose from "mongoose";

// ============ DASHBOARD ENDPOINTS ============

export const getForumDashboard = async (req: Request, res: Response) => {
    try {
        // Get key metrics
        const [
            totalThreads,
            totalReplies,
            totalCategories,
            pendingReports,
            activeUsers,
            pendingApprovals,
            activeBans
        ] = await Promise.all([
            ForumThread.countDocuments(),
            ForumReply.countDocuments(),
            ForumCategory.countDocuments({ isActive: true }),
            ForumReport.countDocuments({ status: 'pending' }),
            User.countDocuments({ role: { $in: ['member', 'editor', 'admin'] } }),
            ThreadApproval.countDocuments({ status: 'pending' }),
            UserForumBan.countDocuments({ isActive: true })
        ]);

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [recentThreads, recentReplies] = await Promise.all([
            ForumThread.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            ForumReply.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
        ]);

        // Get most active categories
        const categoryActivity = await ForumThread.aggregate([
            {
                $group: {
                    _id: "$category",
                    threadCount: { $sum: 1 },
                    lastActivity: { $max: "$lastActivity" }
                }
            },
            {
                $lookup: {
                    from: "forumcategories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            {
                $unwind: "$category"
            },
            {
                $sort: { threadCount: -1 }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    name: "$category.name",
                    threadCount: 1,
                    lastActivity: 1
                }
            }
        ]);

        const dashboardData = {
            metrics: {
                totalThreads,
                totalReplies,
                totalCategories,
                pendingReports,
                activeUsers,
                pendingApprovals,
                activeBans
            },
            recentActivity: {
                recentThreads,
                recentReplies,
                period: "7 days"
            },
            topCategories: categoryActivity
        };

        res.status(200).json({
            message: "Forum dashboard data retrieved successfully",
            data: dashboardData
        });
    } catch (error: any) {
        console.error("Error fetching forum dashboard:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getForumActivity = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Get recent threads
        const recentThreads = await ForumThread.find()
            .populate("author", "name email role")
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title author category createdAt views");

        // Get recent replies
        const recentReplies = await ForumReply.find()
            .populate("author", "name email role")
            .populate({
                path: "thread",
                select: "title",
                populate: {
                    path: "category",
                    select: "name"
                }
            })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("content author thread createdAt");

        // Get recent reports
        const recentReports = await ForumReport.find()
            .populate("reporter", "name email")
            .populate("reportedUser", "name email")
            .sort({ createdAt: -1 })
            .limit(5)
            .select("reportType reason status reporter reportedUser createdAt");

        // Combine and sort all activities by date
        const activities = [
            ...recentThreads.map(thread => ({
                type: 'thread',
                data: thread,
                timestamp: thread.createdAt
            })),
            ...recentReplies.map(reply => ({
                type: 'reply',
                data: reply,
                timestamp: reply.createdAt
            })),
            ...recentReports.map(report => ({
                type: 'report',
                data: report,
                timestamp: report.createdAt
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
         .slice(skip, skip + limit);

        const total = recentThreads.length + recentReplies.length + recentReports.length;

        res.status(200).json({
            message: "Forum activity retrieved successfully",
            data: activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("Error fetching forum activity:", error);
        res.status(500).json({ message: error.message });
    }
};

// ============ CATEGORY MANAGEMENT ENDPOINTS ============

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await ForumCategory.find().sort({ order: 1 });
        
        // Get thread count for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const threadCount = await ForumThread.countDocuments({ category: category._id });
                const replyCount = await ForumReply.aggregate([
                    {
                        $lookup: {
                            from: "forumthreads",
                            localField: "thread",
                            foreignField: "_id",
                            as: "threadData"
                        }
                    },
                    {
                        $match: {
                            "threadData.category": category._id
                        }
                    },
                    {
                        $count: "total"
                    }
                ]);
                
                return {
                    ...category.toObject(),
                    threadCount,
                    replyCount: replyCount[0]?.total || 0
                };
            })
        );

        res.status(200).json({
            message: "Categories retrieved successfully",
            data: categoriesWithCounts
        });
    } catch (error: any) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: error.message });
    }
};

export const createCategoryAdmin = async (req: Request, res: Response) => {
    try {
        const { name, description, slug, icon, order } = req.body;

        if (!name || !description || !slug) {
            return res.status(400).json({ 
                message: "Name, description, and slug are required" 
            });
        }

        // Check if slug already exists
        const existingCategory = await ForumCategory.findOne({ slug });
        if (existingCategory) {
            return res.status(409).json({ 
                message: "Category with this slug already exists" 
            });
        }

        // If no order specified, set it to the highest + 1
        let categoryOrder = order;
        if (categoryOrder === undefined) {
            const lastCategory = await ForumCategory.findOne().sort({ order: -1 });
            categoryOrder = lastCategory ? lastCategory.order + 1 : 1;
        }

        const category = await ForumCategory.create({
            name,
            description,
            slug,
            icon,
            order: categoryOrder,
            isActive: true
        });

        res.status(201).json({
            message: "Category created successfully",
            data: category
        });
    } catch (error: any) {
        console.error("Error creating category:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.params;
        const { name, description, slug, icon, order, isActive } = req.body;

        const category = await ForumCategory.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Check if slug is being changed and if it conflicts
        if (slug && slug !== category.slug) {
            const existingCategory = await ForumCategory.findOne({ 
                slug, 
                _id: { $ne: categoryId } 
            });
            if (existingCategory) {
                return res.status(409).json({ 
                    message: "Category with this slug already exists" 
                });
            }
        }

        // Update fields
        if (name !== undefined) category.name = name;
        if (description !== undefined) category.description = description;
        if (slug !== undefined) category.slug = slug;
        if (icon !== undefined) category.icon = icon;
        if (order !== undefined) category.order = order;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();

        res.status(200).json({
            message: "Category updated successfully",
            data: category
        });
    } catch (error: any) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.params;
        const { migrateTo, deleteThreads } = req.body;

        const category = await ForumCategory.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Check if there are threads in this category
        const threadCount = await ForumThread.countDocuments({ category: categoryId });
        
        if (threadCount > 0) {
            if (deleteThreads) {
                // Delete all threads and their replies
                const threads = await ForumThread.find({ category: categoryId });
                const threadIds = threads.map(thread => thread._id);
                
                // Delete all replies for these threads
                await ForumReply.deleteMany({ thread: { $in: threadIds } });
                
                // Delete all threads
                await ForumThread.deleteMany({ category: categoryId });
            } else if (migrateTo) {
                // Validate migration target
                const targetCategory = await ForumCategory.findById(migrateTo);
                if (!targetCategory) {
                    return res.status(400).json({ 
                        message: "Migration target category not found" 
                    });
                }
                
                // Migrate threads to target category
                await ForumThread.updateMany(
                    { category: categoryId },
                    { category: migrateTo }
                );
            } else {
                return res.status(400).json({
                    message: "Category has threads. Either specify migrateTo category ID or set deleteThreads to true"
                });
            }
        }

        // Delete the category
        await ForumCategory.findByIdAndDelete(categoryId);

        res.status(200).json({
            message: "Category deleted successfully",
            threadsHandled: threadCount > 0 ? (deleteThreads ? "deleted" : "migrated") : "none"
        });
    } catch (error: any) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: error.message });
    }
};

export const reorderCategories = async (req: Request, res: Response) => {
    try {
        const { categoryOrders } = req.body;

        if (!Array.isArray(categoryOrders)) {
            return res.status(400).json({
                message: "categoryOrders must be an array of {id, order} objects"
            });
        }

        // Validate all category IDs exist
        const categoryIds = categoryOrders.map(item => item.id);
        const existingCategories = await ForumCategory.find({
            _id: { $in: categoryIds }
        });

        if (existingCategories.length !== categoryIds.length) {
            return res.status(400).json({
                message: "One or more category IDs are invalid"
            });
        }

        // Update orders in bulk
        const bulkOps = categoryOrders.map(({ id, order }) => ({
            updateOne: {
                filter: { _id: id },
                update: { order }
            }
        }));

        await ForumCategory.bulkWrite(bulkOps);

        // Return updated categories
        const updatedCategories = await ForumCategory.find().sort({ order: 1 });

        res.status(200).json({
            message: "Categories reordered successfully",
            data: updatedCategories
        });
    } catch (error: any) {
        console.error("Error reordering categories:", error);
        res.status(500).json({ message: error.message });
    }
};
// ============ THREAD MODERATION ENDPOINTS ============

export const getAllThreadsAdmin = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const category = req.query.category as string;
        const status = req.query.status as string; // 'pending', 'approved', 'pinned', 'locked'
        const skip = (page - 1) * limit;

        let query: any = {};

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } }
            ];
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Status filters
        if (status === 'pending') {
            query.requiresApproval = true;
            query.isApproved = false;
        } else if (status === 'approved') {
            query.isApproved = true;
        } else if (status === 'pinned') {
            query.isPinned = true;
        } else if (status === 'locked') {
            query.isLocked = true;
        }

        const threads = await ForumThread.find(query)
            .populate("author", "name email role")
            .populate("category", "name slug")
            .populate("moderatedBy", "name email")
            .sort({ isPinned: -1, lastActivity: -1 })
            .skip(skip)
            .limit(limit);

        // Get reply count and last reply for each thread
        const threadsWithCounts = await Promise.all(
            threads.map(async (thread) => {
                const replyCount = await ForumReply.countDocuments({ thread: thread._id });
                const lastReply = await ForumReply.findOne({ thread: thread._id })
                    .sort({ createdAt: -1 })
                    .populate("author", "name");
                
                return {
                    ...thread.toObject(),
                    replyCount,
                    lastReply
                };
            })
        );

        const total = await ForumThread.countDocuments(query);

        res.status(200).json({
            message: "Threads retrieved successfully",
            data: threadsWithCounts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("Error fetching threads:", error);
        res.status(500).json({ message: error.message });
    }
};

export const pinThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const adminId = (req as any).user.id;

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        thread.isPinned = !thread.isPinned;
        thread.moderatedBy = adminId;
        thread.moderatedAt = new Date();
        thread.moderationNotes = `Thread ${thread.isPinned ? 'pinned' : 'unpinned'} by admin`;
        
        await thread.save();

        const updatedThread = await ForumThread.findById(threadId)
            .populate("author", "name email role")
            .populate("category", "name slug")
            .populate("moderatedBy", "name email");

        res.status(200).json({
            message: `Thread ${thread.isPinned ? 'pinned' : 'unpinned'} successfully`,
            data: updatedThread
        });
    } catch (error: any) {
        console.error("Error pinning/unpinning thread:", error);
        res.status(500).json({ message: error.message });
    }
};

export const lockThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const adminId = (req as any).user.id;

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        thread.isLocked = !thread.isLocked;
        thread.moderatedBy = adminId;
        thread.moderatedAt = new Date();
        thread.moderationNotes = `Thread ${thread.isLocked ? 'locked' : 'unlocked'} by admin`;
        
        await thread.save();

        const updatedThread = await ForumThread.findById(threadId)
            .populate("author", "name email role")
            .populate("category", "name slug")
            .populate("moderatedBy", "name email");

        res.status(200).json({
            message: `Thread ${thread.isLocked ? 'locked' : 'unlocked'} successfully`,
            data: updatedThread
        });
    } catch (error: any) {
        console.error("Error locking/unlocking thread:", error);
        res.status(500).json({ message: error.message });
    }
};

export const moveThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const { categoryId, reason } = req.body;
        const adminId = (req as any).user.id;

        if (!categoryId) {
            return res.status(400).json({ message: "Category ID is required" });
        }

        const [thread, targetCategory] = await Promise.all([
            ForumThread.findById(threadId),
            ForumCategory.findById(categoryId)
        ]);

        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        if (!targetCategory) {
            return res.status(404).json({ message: "Target category not found" });
        }

        const oldCategory = await ForumCategory.findById(thread.category);
        
        thread.category = categoryId;
        thread.moderatedBy = adminId;
        thread.moderatedAt = new Date();
        thread.moderationNotes = reason || `Thread moved from ${oldCategory?.name} to ${targetCategory.name}`;
        
        await thread.save();

        const updatedThread = await ForumThread.findById(threadId)
            .populate("author", "name email role")
            .populate("category", "name slug")
            .populate("moderatedBy", "name email");

        res.status(200).json({
            message: "Thread moved successfully",
            data: updatedThread
        });
    } catch (error: any) {
        console.error("Error moving thread:", error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteThreadAdmin = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const { reason } = req.body;

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        // Delete all replies first
        await ForumReply.deleteMany({ thread: threadId });
        
        // Delete thread approvals if any
        await ThreadApproval.deleteMany({ thread: threadId });
        
        // Delete the thread
        await ForumThread.findByIdAndDelete(threadId);

        res.status(200).json({
            message: "Thread and all replies deleted successfully",
            reason: reason || "Deleted by admin"
        });
    } catch (error: any) {
        console.error("Error deleting thread:", error);
        res.status(500).json({ message: error.message });
    }
};

export const bulkThreadActions = async (req: Request, res: Response) => {
    try {
        const { threadIds, action, data } = req.body;
        const adminId = (req as any).user.id;

        if (!Array.isArray(threadIds) || threadIds.length === 0) {
            return res.status(400).json({ message: "Thread IDs array is required" });
        }

        if (!action) {
            return res.status(400).json({ message: "Action is required" });
        }

        const validActions = ['pin', 'unpin', 'lock', 'unlock', 'delete', 'move', 'approve', 'reject'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ 
                message: `Invalid action. Valid actions: ${validActions.join(', ')}` 
            });
        }

        let updateQuery: any = {
            moderatedBy: adminId,
            moderatedAt: new Date()
        };

        let moderationNote = '';

        switch (action) {
            case 'pin':
                updateQuery.isPinned = true;
                moderationNote = 'Bulk pinned by admin';
                break;
            case 'unpin':
                updateQuery.isPinned = false;
                moderationNote = 'Bulk unpinned by admin';
                break;
            case 'lock':
                updateQuery.isLocked = true;
                moderationNote = 'Bulk locked by admin';
                break;
            case 'unlock':
                updateQuery.isLocked = false;
                moderationNote = 'Bulk unlocked by admin';
                break;
            case 'move':
                if (!data?.categoryId) {
                    return res.status(400).json({ message: "Category ID required for move action" });
                }
                const targetCategory = await ForumCategory.findById(data.categoryId);
                if (!targetCategory) {
                    return res.status(404).json({ message: "Target category not found" });
                }
                updateQuery.category = data.categoryId;
                moderationNote = `Bulk moved to ${targetCategory.name}`;
                break;
            case 'approve':
                updateQuery.isApproved = true;
                moderationNote = 'Bulk approved by admin';
                break;
            case 'reject':
                updateQuery.isApproved = false;
                moderationNote = 'Bulk rejected by admin';
                break;
            case 'delete':
                // Handle delete separately
                await ForumReply.deleteMany({ thread: { $in: threadIds } });
                await ThreadApproval.deleteMany({ thread: { $in: threadIds } });
                await ForumThread.deleteMany({ _id: { $in: threadIds } });
                
                return res.status(200).json({
                    message: `${threadIds.length} threads and their replies deleted successfully`
                });
        }

        updateQuery.moderationNotes = data?.reason || moderationNote;

        const result = await ForumThread.updateMany(
            { _id: { $in: threadIds } },
            updateQuery
        );

        res.status(200).json({
            message: `Bulk action '${action}' applied successfully`,
            modifiedCount: result.modifiedCount,
            totalRequested: threadIds.length
        });
    } catch (error: any) {
        console.error("Error performing bulk thread action:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getPendingApprovals = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const pendingThreads = await ForumThread.find({
            requiresApproval: true,
            isApproved: false
        })
        .populate("author", "name email role")
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const total = await ForumThread.countDocuments({
            requiresApproval: true,
            isApproved: false
        });

        res.status(200).json({
            message: "Pending approvals retrieved successfully",
            data: pendingThreads,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("Error fetching pending approvals:", error);
        res.status(500).json({ message: error.message });
    }
};

export const approveThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const { reviewNotes } = req.body;
        const adminId = (req as any).user.id;

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        // Update thread approval status
        thread.isApproved = true;
        thread.moderatedBy = adminId;
        thread.moderatedAt = new Date();
        thread.moderationNotes = reviewNotes || 'Thread approved by admin';
        
        await thread.save();

        // Create or update thread approval record
        await ThreadApproval.findOneAndUpdate(
            { thread: threadId },
            {
                thread: threadId,
                status: 'approved',
                reviewedBy: adminId,
                reviewedAt: new Date(),
                reviewNotes: reviewNotes || 'Approved'
            },
            { upsert: true }
        );

        const updatedThread = await ForumThread.findById(threadId)
            .populate("author", "name email role")
            .populate("category", "name slug")
            .populate("moderatedBy", "name email");

        res.status(200).json({
            message: "Thread approved successfully",
            data: updatedThread
        });
    } catch (error: any) {
        console.error("Error approving thread:", error);
        res.status(500).json({ message: error.message });
    }
};

export const rejectThread = async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;
        const { reviewNotes } = req.body;
        const adminId = (req as any).user.id;

        const thread = await ForumThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: "Thread not found" });
        }

        // Update thread approval status
        thread.isApproved = false;
        thread.moderatedBy = adminId;
        thread.moderatedAt = new Date();
        thread.moderationNotes = reviewNotes || 'Thread rejected by admin';
        
        await thread.save();

        // Create or update thread approval record
        await ThreadApproval.findOneAndUpdate(
            { thread: threadId },
            {
                thread: threadId,
                status: 'rejected',
                reviewedBy: adminId,
                reviewedAt: new Date(),
                reviewNotes: reviewNotes || 'Rejected'
            },
            { upsert: true }
        );

        const updatedThread = await ForumThread.findById(threadId)
            .populate("author", "name email role")
            .populate("category", "name slug")
            .populate("moderatedBy", "name email");

        res.status(200).json({
            message: "Thread rejected successfully",
            data: updatedThread
        });
    } catch (error: any) {
        console.error("Error rejecting thread:", error);
        res.status(500).json({ message: error.message });
    }
};
// ============ USER MANAGEMENT ENDPOINTS ============

export const getForumUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const role = req.query.role as string;
        const status = req.query.status as string; // 'banned', 'suspended', 'muted', 'active'
        const skip = (page - 1) * limit;

        let userQuery: any = {};

        // Search filter
        if (search) {
            userQuery.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        // Role filter
        if (role) {
            userQuery.role = role;
        }

        const users = await User.find(userQuery)
            .select("-password -resetPasswordToken -resetPasswordExpire")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get forum activity and ban status for each user
        const usersWithActivity = await Promise.all(
            users.map(async (user) => {
                const [threadCount, replyCount, activeBan] = await Promise.all([
                    ForumThread.countDocuments({ author: user._id }),
                    ForumReply.countDocuments({ author: user._id }),
                    UserForumBan.findOne({ 
                        user: user._id, 
                        isActive: true,
                        $or: [
                            { expiresAt: { $exists: false } }, // Permanent ban
                            { expiresAt: { $gt: new Date() } } // Active temporary ban
                        ]
                    })
                ]);

                const lastActivity = await ForumThread.findOne({ author: user._id })
                    .sort({ lastActivity: -1 })
                    .select("lastActivity");

                let userStatus = 'active';
                if (activeBan) {
                    userStatus = activeBan.banType;
                }

                // Filter by status if specified
                if (status && status !== userStatus) {
                    return null;
                }

                return {
                    ...user.toObject(),
                    forumActivity: {
                        threadCount,
                        replyCount,
                        lastActivity: lastActivity?.lastActivity
                    },
                    banStatus: activeBan ? {
                        type: activeBan.banType,
                        reason: activeBan.reason,
                        expiresAt: activeBan.expiresAt,
                        bannedBy: activeBan.bannedBy
                    } : null,
                    status: userStatus
                };
            })
        );

        // Filter out null values (users that didn't match status filter)
        const filteredUsers = usersWithActivity.filter(user => user !== null);

        const total = await User.countDocuments(userQuery);

        res.status(200).json({
            message: "Forum users retrieved successfully",
            data: filteredUsers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("Error fetching forum users:", error);
        res.status(500).json({ message: error.message });
    }
};

export const banUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { banType, duration, reason } = req.body;
        const adminId = (req as any).user.id;

        if (!banType || !reason) {
            return res.status(400).json({ 
                message: "Ban type and reason are required" 
            });
        }

        const validBanTypes = ['permanent', 'temporary', 'mute'];
        if (!validBanTypes.includes(banType)) {
            return res.status(400).json({ 
                message: `Invalid ban type. Valid types: ${validBanTypes.join(', ')}` 
            });
        }

        if (banType === 'temporary' && !duration) {
            return res.status(400).json({ 
                message: "Duration (in days) is required for temporary bans" 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: "Cannot ban admin users" });
        }

        // Check if user already has an active ban
        const existingBan = await UserForumBan.findOne({ 
            user: userId, 
            isActive: true 
        });

        if (existingBan) {
            return res.status(409).json({ 
                message: "User already has an active ban/restriction" 
            });
        }

        // Calculate expiration date for temporary bans
        let expiresAt;
        if (banType === 'temporary') {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(duration));
        }

        // Create ban record
        const ban = await UserForumBan.create({
            user: userId,
            banType,
            duration: banType === 'temporary' ? duration : undefined,
            reason,
            bannedBy: adminId,
            isActive: true,
            expiresAt
        });

        const populatedBan = await UserForumBan.findById(ban._id)
            .populate("user", "name email")
            .populate("bannedBy", "name email");

        res.status(201).json({
            message: `User ${banType === 'mute' ? 'muted' : 'banned'} successfully`,
            data: populatedBan
        });
    } catch (error: any) {
        console.error("Error banning user:", error);
        res.status(500).json({ message: error.message });
    }
};

export const unbanUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find and deactivate active ban
        const activeBan = await UserForumBan.findOne({ 
            user: userId, 
            isActive: true 
        });

        if (!activeBan) {
            return res.status(404).json({ 
                message: "No active ban found for this user" 
            });
        }

        activeBan.isActive = false;
        await activeBan.save();

        res.status(200).json({
            message: "User ban/restriction removed successfully",
            reason: reason || "Removed by admin"
        });
    } catch (error: any) {
        console.error("Error unbanning user:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getUserForumActivity = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId).select("name email role");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get user's threads
        const threads = await ForumThread.find({ author: userId })
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title category createdAt views isPinned isLocked");

        // Get user's replies
        const replies = await ForumReply.find({ author: userId })
            .populate({
                path: "thread",
                select: "title",
                populate: {
                    path: "category",
                    select: "name"
                }
            })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("content thread createdAt");

        // Get ban history
        const banHistory = await UserForumBan.find({ user: userId })
            .populate("bannedBy", "name email")
            .sort({ createdAt: -1 });

        // Get current ban status
        const currentBan = await UserForumBan.findOne({ 
            user: userId, 
            isActive: true,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: new Date() } }
            ]
        }).populate("bannedBy", "name email");

        // Calculate statistics
        const stats = {
            totalThreads: await ForumThread.countDocuments({ author: userId }),
            totalReplies: await ForumReply.countDocuments({ author: userId }),
            totalViews: await ForumThread.aggregate([
                { $match: { author: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: null, totalViews: { $sum: "$views" } } }
            ]).then(result => result[0]?.totalViews || 0),
            joinDate: user.createdAt,
            lastActivity: threads[0]?.createdAt || replies[0]?.createdAt
        };

        res.status(200).json({
            message: "User forum activity retrieved successfully",
            data: {
                user,
                stats,
                recentThreads: threads,
                recentReplies: replies,
                banHistory,
                currentBan
            }
        });
    } catch (error: any) {
        console.error("Error fetching user forum activity:", error);
        res.status(500).json({ message: error.message });
    }
};
// ============ REPORT MANAGEMENT ENDPOINTS ============

export const getAllReports = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const reportType = req.query.reportType as string;
        const dateFrom = req.query.dateFrom as string;
        const dateTo = req.query.dateTo as string;
        const skip = (page - 1) * limit;

        let query: any = {};

        // Status filter
        if (status) {
            query.status = status;
        }

        // Report type filter
        if (reportType) {
            query.reportType = reportType;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) {
                query.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                query.createdAt.$lte = new Date(dateTo);
            }
        }

        const reports = await ForumReport.find(query)
            .populate("reporter", "name email role")
            .populate("reportedUser", "name email role")
            .populate("resolvedBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Manually populate reportedContent based on reportType
        const populatedReports = await Promise.all(
            reports.map(async (report) => {
                let populatedContent: any = null;
                if (report.reportedContent) {
                    if (report.reportType === 'thread') {
                        populatedContent = await ForumThread.findById(report.reportedContent)
                            .populate("author", "name email")
                            .populate("category", "name");
                    } else if (report.reportType === 'reply') {
                        populatedContent = await ForumReply.findById(report.reportedContent)
                            .populate("author", "name email");
                    }
                }
                
                return {
                    ...report.toObject(),
                    reportedContent: populatedContent
                };
            })
        );

        const total = await ForumReport.countDocuments(query);

        // Get report statistics
        const stats = await ForumReport.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const reportStats = {
            total: await ForumReport.countDocuments(),
            pending: stats.find(s => s._id === 'pending')?.count || 0,
            resolved: stats.find(s => s._id === 'resolved')?.count || 0,
            dismissed: stats.find(s => s._id === 'dismissed')?.count || 0
        };

        res.status(200).json({
            message: "Reports retrieved successfully",
            data: populatedReports,
            stats: reportStats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getReportById = async (req: Request, res: Response) => {
    try {
        const { reportId } = req.params;

        const report = await ForumReport.findById(reportId)
            .populate("reporter", "name email role profile.image")
            .populate("reportedUser", "name email role profile.image")
            .populate("resolvedBy", "name email");

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        // Manually populate reportedContent based on reportType
        let populatedContent: any = null;
        if (report.reportedContent) {
            if (report.reportType === 'thread') {
                populatedContent = await ForumThread.findById(report.reportedContent)
                    .populate("author", "name email role profile.image")
                    .populate("category", "name slug");
            } else if (report.reportType === 'reply') {
                populatedContent = await ForumReply.findById(report.reportedContent)
                    .populate("author", "name email role profile.image")
                    .populate({
                        path: "thread",
                        select: "title",
                        populate: {
                            path: "category",
                            select: "name"
                        }
                    });
            }
        }

        // Get additional context based on report type
        let additionalContext: any = null;
        if (report.reportType === 'reply' && populatedContent) {
            // Get the thread context for reply reports
            const reply = populatedContent as any;
            if (reply.thread) {
                additionalContext = {
                    threadTitle: reply.thread.title,
                    threadCategory: reply.thread.category?.name
                };
            }
        }

        res.status(200).json({
            message: "Report details retrieved successfully",
            data: {
                ...report.toObject(),
                reportedContent: populatedContent,
                additionalContext
            }
        });
    } catch (error: any) {
        console.error("Error fetching report details:", error);
        res.status(500).json({ message: error.message });
    }
};

// Helper function to create notifications
const createNotification = async (userId: string, title: string, message: string, type: string = "forum") => {
    try {
        await Notification.create({
            user: userId,
            title,
            message,
            type,
            read: false
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

export const resolveReport = async (req: Request, res: Response) => {
    try {
        const { reportId } = req.params;
        const { resolutionNotes, actionTaken } = req.body;
        const adminId = (req as any).user.id;

        const report = await ForumReport.findById(reportId);
        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ 
                message: "Only pending reports can be resolved" 
            });
        }

        // Update report status
        report.status = 'resolved';
        report.resolvedBy = adminId;
        report.resolvedAt = new Date();
        report.resolutionNotes = resolutionNotes || 'Resolved by admin';
        
        await report.save();

        // Perform additional actions based on actionTaken
        if (actionTaken) {
            switch (actionTaken) {
                case 'delete_content':
                    if (report.reportType === 'thread') {
                        await ForumThread.findByIdAndDelete(report.reportedContent);
                        await ForumReply.deleteMany({ thread: report.reportedContent });
                    } else if (report.reportType === 'reply') {
                        await ForumReply.findByIdAndDelete(report.reportedContent);
                    }
                    break;
                case 'ban_user':
                    if (report.reportedUser) {
                        await UserForumBan.create({
                            user: report.reportedUser,
                            banType: 'permanent',
                            reason: `Banned due to report: ${report.reason}`,
                            bannedBy: adminId,
                            isActive: true
                        });
                    }
                    break;
                case 'suspend_user':
                    if (report.reportedUser) {
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 7); // 7 day suspension
                        
                        await UserForumBan.create({
                            user: report.reportedUser,
                            banType: 'temporary',
                            duration: 7,
                            reason: `Suspended due to report: ${report.reason}`,
                            bannedBy: adminId,
                            isActive: true,
                            expiresAt
                        });
                    }
                    break;
            }
        }

        const updatedReport = await ForumReport.findById(reportId)
            .populate("reporter", "name email")
            .populate("reportedUser", "name email")
            .populate("resolvedBy", "name email");

        // Send notification to reporter
        if (report.reporter) {
            await createNotification(
                report.reporter.toString(),
                "Report Resolved",
                `Your report regarding ${report.reportType} has been resolved. ${resolutionNotes || 'Thank you for helping maintain our community standards.'}`,
                "forum"
            );
        }

        // Send notification to reported user if action was taken
        if (report.reportedUser && actionTaken && actionTaken !== 'none') {
            let actionMessage = "";
            switch (actionTaken) {
                case 'delete_content':
                    actionMessage = "Your content has been removed due to a community report.";
                    break;
                case 'ban_user':
                    actionMessage = "Your account has been permanently banned from the forum due to a community report.";
                    break;
                case 'suspend_user':
                    actionMessage = "Your account has been temporarily suspended from the forum for 7 days due to a community report.";
                    break;
            }
            
            if (actionMessage) {
                await createNotification(
                    report.reportedUser.toString(),
                    "Forum Action Taken",
                    `${actionMessage} Reason: ${report.reason}. ${resolutionNotes || ''}`,
                    "forum"
                );
            }
        }

        res.status(200).json({
            message: "Report resolved successfully",
            data: updatedReport,
            actionTaken: actionTaken || 'none'
        });
    } catch (error: any) {
        console.error("Error resolving report:", error);
        res.status(500).json({ message: error.message });
    }
};

export const dismissReport = async (req: Request, res: Response) => {
    try {
        const { reportId } = req.params;
        const { resolutionNotes } = req.body;
        const adminId = (req as any).user.id;

        const report = await ForumReport.findById(reportId);
        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ 
                message: "Only pending reports can be dismissed" 
            });
        }

        // Update report status
        report.status = 'dismissed';
        report.resolvedBy = adminId;
        report.resolvedAt = new Date();
        report.resolutionNotes = resolutionNotes || 'Dismissed by admin';
        
        await report.save();

        const updatedReport = await ForumReport.findById(reportId)
            .populate("reporter", "name email")
            .populate("reportedUser", "name email")
            .populate("resolvedBy", "name email");

        // Send notification to reporter
        if (report.reporter) {
            await createNotification(
                report.reporter.toString(),
                "Report Dismissed",
                `Your report regarding ${report.reportType} has been reviewed and dismissed. ${resolutionNotes || 'Thank you for helping maintain our community standards.'}`,
                "forum"
            );
        }

        res.status(200).json({
            message: "Report dismissed successfully",
            data: updatedReport
        });
    } catch (error: any) {
        console.error("Error dismissing report:", error);
        res.status(500).json({ message: error.message });
    }
};

export const bulkReportActions = async (req: Request, res: Response) => {
    try {
        const { reportIds, action, resolutionNotes } = req.body;
        const adminId = (req as any).user.id;

        if (!Array.isArray(reportIds) || reportIds.length === 0) {
            return res.status(400).json({ message: "Report IDs array is required" });
        }

        if (!action) {
            return res.status(400).json({ message: "Action is required" });
        }

        const validActions = ['resolve', 'dismiss'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ 
                message: `Invalid action. Valid actions: ${validActions.join(', ')}` 
            });
        }

        const updateData: any = {
            status: action === 'resolve' ? 'resolved' : 'dismissed',
            resolvedBy: adminId,
            resolvedAt: new Date(),
            resolutionNotes: resolutionNotes || `Bulk ${action}d by admin`
        };

        const result = await ForumReport.updateMany(
            { 
                _id: { $in: reportIds },
                status: 'pending' // Only update pending reports
            },
            updateData
        );

        res.status(200).json({
            message: `Bulk action '${action}' applied successfully`,
            modifiedCount: result.modifiedCount,
            totalRequested: reportIds.length
        });
    } catch (error: any) {
        console.error("Error performing bulk report action:", error);
        res.status(500).json({ message: error.message });
    }
};
// ============ ANALYTICS ENDPOINTS ============

export const getForumAnalyticsOverview = async (req: Request, res: Response) => {
    try {
        const dateFrom = req.query.dateFrom as string;
        const dateTo = req.query.dateTo as string;
        const categoryId = req.query.categoryId as string;

        // Build date filter
        let dateFilter: any = {};
        if (dateFrom || dateTo) {
            dateFilter.createdAt = {};
            if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
        }

        // Build category filter
        let categoryFilter: any = {};
        if (categoryId) {
            categoryFilter.category = categoryId;
        }

        // Combine filters
        const threadFilter = { ...dateFilter, ...categoryFilter };
        const replyFilter = dateFilter;

        // Get basic metrics
        const [
            totalThreads,
            totalReplies,
            totalUsers,
            totalViews,
            activeCategories
        ] = await Promise.all([
            ForumThread.countDocuments(threadFilter),
            ForumReply.countDocuments(replyFilter),
            User.countDocuments({ role: { $in: ['member', 'editor', 'admin'] } }),
            ForumThread.aggregate([
                { $match: threadFilter },
                { $group: { _id: null, totalViews: { $sum: "$views" } } }
            ]).then(result => result[0]?.totalViews || 0),
            ForumCategory.countDocuments({ isActive: true })
        ]);

        // Get activity over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activityOverTime = await ForumThread.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                    ...categoryFilter
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    threadCount: { $sum: 1 },
                    totalViews: { $sum: "$views" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);

        // Get most active categories
        const topCategories = await ForumThread.aggregate([
            { $match: threadFilter },
            {
                $group: {
                    _id: "$category",
                    threadCount: { $sum: 1 },
                    totalViews: { $sum: "$views" },
                    lastActivity: { $max: "$lastActivity" }
                }
            },
            {
                $lookup: {
                    from: "forumcategories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            {
                $unwind: "$category"
            },
            {
                $sort: { threadCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    name: "$category.name",
                    slug: "$category.slug",
                    threadCount: 1,
                    totalViews: 1,
                    lastActivity: 1
                }
            }
        ]);

        // Get most active users
        const topUsers = await ForumThread.aggregate([
            { $match: threadFilter },
            {
                $group: {
                    _id: "$author",
                    threadCount: { $sum: 1 },
                    totalViews: { $sum: "$views" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $lookup: {
                    from: "forumreplies",
                    localField: "_id",
                    foreignField: "author",
                    as: "replies"
                }
            },
            {
                $addFields: {
                    replyCount: { $size: "$replies" }
                }
            },
            {
                $sort: { threadCount: -1, replyCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    name: "$user.name",
                    email: "$user.email",
                    role: "$user.role",
                    threadCount: 1,
                    replyCount: 1,
                    totalViews: 1
                }
            }
        ]);

        res.status(200).json({
            message: "Forum analytics overview retrieved successfully",
            data: {
                metrics: {
                    totalThreads,
                    totalReplies,
                    totalUsers,
                    totalViews,
                    activeCategories
                },
                activityOverTime,
                topCategories,
                topUsers
            }
        });
    } catch (error: any) {
        console.error("Error fetching analytics overview:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getForumActivityMetrics = async (req: Request, res: Response) => {
    try {
        const period = req.query.period as string || '30'; // days
        const categoryId = req.query.categoryId as string;

        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));

        let categoryFilter: any = {};
        if (categoryId) {
            categoryFilter.category = categoryId;
        }

        // Get daily activity metrics
        const dailyActivity = await ForumThread.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo },
                    ...categoryFilter
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    threadCount: { $sum: 1 },
                    totalViews: { $sum: "$views" },
                    uniqueAuthors: { $addToSet: "$author" }
                }
            },
            {
                $addFields: {
                    uniqueAuthorCount: { $size: "$uniqueAuthors" },
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    }
                }
            },
            {
                $sort: { date: 1 }
            },
            {
                $project: {
                    date: 1,
                    threadCount: 1,
                    totalViews: 1,
                    uniqueAuthorCount: 1
                }
            }
        ]);

        // Get reply activity
        const replyActivity = await ForumReply.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo }
                }
            },
            {
                $lookup: {
                    from: "forumthreads",
                    localField: "thread",
                    foreignField: "_id",
                    as: "threadData"
                }
            },
            {
                $unwind: "$threadData"
            },
            ...(categoryId ? [{ $match: { "threadData.category": new mongoose.Types.ObjectId(categoryId) } }] : []),
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    replyCount: { $sum: 1 },
                    uniqueRepliers: { $addToSet: "$author" }
                }
            },
            {
                $addFields: {
                    uniqueReplierCount: { $size: "$uniqueRepliers" },
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    }
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);

        // Merge thread and reply activity by date
        const activityMap = new Map();
        
        dailyActivity.forEach(day => {
            const dateKey = day.date.toISOString().split('T')[0];
            activityMap.set(dateKey, {
                date: day.date,
                threadCount: day.threadCount,
                totalViews: day.totalViews,
                uniqueAuthorCount: day.uniqueAuthorCount,
                replyCount: 0,
                uniqueReplierCount: 0
            });
        });

        replyActivity.forEach(day => {
            const dateKey = day.date.toISOString().split('T')[0];
            const existing = activityMap.get(dateKey) || {
                date: day.date,
                threadCount: 0,
                totalViews: 0,
                uniqueAuthorCount: 0,
                replyCount: 0,
                uniqueReplierCount: 0
            };
            
            existing.replyCount = day.replyCount;
            existing.uniqueReplierCount = day.uniqueReplierCount;
            activityMap.set(dateKey, existing);
        });

        const combinedActivity = Array.from(activityMap.values()).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        res.status(200).json({
            message: "Forum activity metrics retrieved successfully",
            data: {
                period: `${period} days`,
                dailyActivity: combinedActivity
            }
        });
    } catch (error: any) {
        console.error("Error fetching activity metrics:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getUserEngagementMetrics = async (req: Request, res: Response) => {
    try {
        const period = req.query.period as string || '30';
        const categoryId = req.query.categoryId as string;

        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));

        let categoryFilter: any = {};
        if (categoryId) {
            categoryFilter.category = categoryId;
        }

        // Get user engagement metrics
        const userEngagement = await User.aggregate([
            {
                $match: {
                    role: { $in: ['member', 'editor', 'admin'] },
                    createdAt: { $gte: daysAgo }
                }
            },
            {
                $lookup: {
                    from: "forumthreads",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$author", "$$userId"] },
                                createdAt: { $gte: daysAgo },
                                ...categoryFilter
                            }
                        }
                    ],
                    as: "threads"
                }
            },
            {
                $lookup: {
                    from: "forumreplies",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$author", "$$userId"] },
                                createdAt: { $gte: daysAgo }
                            }
                        },
                        ...(categoryId ? [
                            {
                                $lookup: {
                                    from: "forumthreads",
                                    localField: "thread",
                                    foreignField: "_id",
                                    as: "threadData"
                                }
                            },
                            {
                                $match: {
                                    "threadData.category": new mongoose.Types.ObjectId(categoryId)
                                }
                            }
                        ] : [])
                    ],
                    as: "replies"
                }
            },
            {
                $addFields: {
                    threadCount: { $size: "$threads" },
                    replyCount: { $size: "$replies" },
                    totalViews: { $sum: "$threads.views" },
                    engagementScore: {
                        $add: [
                            { $multiply: [{ $size: "$threads" }, 3] }, // Threads worth 3 points
                            { $size: "$replies" } // Replies worth 1 point
                        ]
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { threadCount: { $gt: 0 } },
                        { replyCount: { $gt: 0 } }
                    ]
                }
            },
            {
                $sort: { engagementScore: -1 }
            },
            {
                $limit: 20
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    role: 1,
                    threadCount: 1,
                    replyCount: 1,
                    totalViews: 1,
                    engagementScore: 1,
                    joinDate: "$createdAt"
                }
            }
        ]);

        // Calculate engagement statistics
        const engagementStats = {
            totalActiveUsers: userEngagement.length,
            averageThreadsPerUser: userEngagement.reduce((sum, user) => sum + user.threadCount, 0) / userEngagement.length || 0,
            averageRepliesPerUser: userEngagement.reduce((sum, user) => sum + user.replyCount, 0) / userEngagement.length || 0,
            totalEngagementScore: userEngagement.reduce((sum, user) => sum + user.engagementScore, 0)
        };

        res.status(200).json({
            message: "User engagement metrics retrieved successfully",
            data: {
                period: `${period} days`,
                stats: engagementStats,
                topUsers: userEngagement
            }
        });
    } catch (error: any) {
        console.error("Error fetching user engagement metrics:", error);
        res.status(500).json({ message: error.message });
    }
};

export const exportForumAnalytics = async (req: Request, res: Response) => {
    try {
        const format = req.query.format as string || 'json';
        const dateFrom = req.query.dateFrom as string;
        const dateTo = req.query.dateTo as string;
        const categoryId = req.query.categoryId as string;

        if (!['json', 'csv'].includes(format)) {
            return res.status(400).json({ 
                message: "Invalid format. Supported formats: json, csv" 
            });
        }

        // Build filters
        let dateFilter: any = {};
        if (dateFrom || dateTo) {
            dateFilter.createdAt = {};
            if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
        }

        let categoryFilter: any = {};
        if (categoryId) {
            categoryFilter.category = categoryId;
        }

        const threadFilter = { ...dateFilter, ...categoryFilter };

        // Get comprehensive analytics data
        const [threads, replies, categories, users] = await Promise.all([
            ForumThread.find(threadFilter)
                .populate("author", "name email role")
                .populate("category", "name")
                .select("title author category createdAt views isPinned isLocked")
                .lean(),
            ForumReply.find(dateFilter)
                .populate("author", "name email role")
                .populate({
                    path: "thread",
                    select: "title category",
                    populate: {
                        path: "category",
                        select: "name"
                    }
                })
                .select("author thread createdAt")
                .lean(),
            ForumCategory.find({ isActive: true }).select("name slug order").lean(),
            User.find({ role: { $in: ['member', 'editor', 'admin'] } })
                .select("name email role createdAt")
                .lean()
        ]);

        const exportData = {
            exportDate: new Date().toISOString(),
            filters: {
                dateFrom,
                dateTo,
                categoryId
            },
            summary: {
                totalThreads: threads.length,
                totalReplies: replies.length,
                totalCategories: categories.length,
                totalUsers: users.length
            },
            threads: threads.map(thread => ({
                id: thread._id,
                title: thread.title,
                author: (thread.author as any)?.name,
                authorEmail: (thread.author as any)?.email,
                category: (thread.category as any)?.name,
                createdAt: thread.createdAt,
                views: thread.views,
                isPinned: thread.isPinned,
                isLocked: thread.isLocked
            })),
            replies: replies.map(reply => ({
                id: reply._id,
                author: (reply.author as any)?.name,
                authorEmail: (reply.author as any)?.email,
                threadTitle: (reply.thread as any)?.title,
                threadCategory: (reply.thread as any)?.category?.name,
                createdAt: reply.createdAt
            })),
            categories: categories.map(category => ({
                id: category._id,
                name: category.name,
                slug: category.slug,
                order: category.order
            })),
            users: users.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                joinDate: user.createdAt
            }))
        };

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="forum-analytics-${new Date().toISOString().split('T')[0]}.json"`);
            res.status(200).json(exportData);
        } else if (format === 'csv') {
            // Simple CSV export of threads data
            const csvHeaders = 'ID,Title,Author,Category,Created,Views,Pinned,Locked\n';
            const csvData = threads.map(thread => 
                `"${thread._id}","${thread.title}","${(thread.author as any)?.name}","${(thread.category as any)?.name}","${thread.createdAt}","${thread.views}","${thread.isPinned}","${thread.isLocked}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="forum-threads-${new Date().toISOString().split('T')[0]}.csv"`);
            res.status(200).send(csvHeaders + csvData);
        }
    } catch (error: any) {
        console.error("Error exporting analytics:", error);
        res.status(500).json({ message: error.message });
    }
};
// ============ REPLY MODERATION ENDPOINTS ============

export const getAllRepliesAdmin = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const threadId = req.query.threadId as string;
        const skip = (page - 1) * limit;

        let query: any = {};

        // Search filter
        if (search) {
            query.content = { $regex: search, $options: "i" };
        }

        // Thread filter
        if (threadId) {
            query.thread = threadId;
        }

        const replies = await ForumReply.find(query)
            .populate("author", "name email role")
            .populate("moderatedBy", "name email")
            .populate({
                path: "thread",
                select: "title",
                populate: {
                    path: "category",
                    select: "name"
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ForumReply.countDocuments(query);

        res.status(200).json({
            message: "Replies retrieved successfully",
            data: replies,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("Error fetching replies:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateReplyAdmin = async (req: Request, res: Response) => {
    try {
        const { replyId } = req.params;
        const { content, reason } = req.body;
        const adminId = (req as any).user.id;

        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }

        const reply = await ForumReply.findById(replyId);
        if (!reply) {
            return res.status(404).json({ message: "Reply not found" });
        }

        // Store original content for audit
        const originalContent = reply.content;

        // Update reply
        reply.content = content;
        reply.isEdited = true;
        reply.editedAt = new Date();
        reply.moderatedBy = adminId;
        reply.moderatedAt = new Date();
        reply.moderationNotes = reason || 'Reply edited by admin';

        await reply.save();

        const updatedReply = await ForumReply.findById(replyId)
            .populate("author", "name email role")
            .populate("moderatedBy", "name email")
            .populate({
                path: "thread",
                select: "title",
                populate: {
                    path: "category",
                    select: "name"
                }
            });

        res.status(200).json({
            message: "Reply updated successfully",
            data: updatedReply
        });
    } catch (error: any) {
        console.error("Error updating reply:", error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteReplyAdmin = async (req: Request, res: Response) => {
    try {
        const { replyId } = req.params;
        const { reason } = req.body;

        const reply = await ForumReply.findById(replyId);
        if (!reply) {
            return res.status(404).json({ message: "Reply not found" });
        }

        // Delete the reply
        await ForumReply.findByIdAndDelete(replyId);

        res.status(200).json({
            message: "Reply deleted successfully",
            reason: reason || "Deleted by admin"
        });
    } catch (error: any) {
        console.error("Error deleting reply:", error);
        res.status(500).json({ message: error.message });
    }
};

export const bulkReplyActions = async (req: Request, res: Response) => {
    try {
        const { replyIds, action, data } = req.body;
        const adminId = (req as any).user.id;

        if (!Array.isArray(replyIds) || replyIds.length === 0) {
            return res.status(400).json({ message: "Reply IDs array is required" });
        }

        if (!action) {
            return res.status(400).json({ message: "Action is required" });
        }

        const validActions = ['delete', 'edit'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ 
                message: `Invalid action. Valid actions: ${validActions.join(', ')}` 
            });
        }

        let result: any;

        switch (action) {
            case 'delete':
                result = await ForumReply.deleteMany({ _id: { $in: replyIds } });
                break;
            case 'edit':
                if (!data?.content) {
                    return res.status(400).json({ message: "Content required for edit action" });
                }
                
                const updateQuery = {
                    content: data.content,
                    isEdited: true,
                    editedAt: new Date(),
                    moderatedBy: adminId,
                    moderatedAt: new Date(),
                    moderationNotes: data.reason || 'Bulk edited by admin'
                };

                result = await ForumReply.updateMany(
                    { _id: { $in: replyIds } },
                    updateQuery
                );
                break;
        }

        res.status(200).json({
            message: `Bulk action '${action}' applied successfully`,
            modifiedCount: result.modifiedCount || result.deletedCount,
            totalRequested: replyIds.length
        });
    } catch (error: any) {
        console.error("Error performing bulk reply action:", error);
        res.status(500).json({ message: error.message });
    }
};