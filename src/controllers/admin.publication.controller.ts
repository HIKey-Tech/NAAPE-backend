import { Request, Response } from "express";
import Publication from "../models/Publication";
import User from "../models/User";
import Notification from "../models/Notification";

// Get all publications (admin only) with filters
export const getAllPublications = async (req: Request, res: Response) => {
    try {
        const { status, search, startDate, endDate, page = 1, limit = 20 } = req.query;

        const filter: any = {};

        // Filter by status
        if (status && ["draft", "pending", "approved", "rejected"].includes(status as string)) {
            filter.status = status;
        }

        // Filter by date range
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate as string);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate as string);
            }
        }

        // Search filter (title, content, or author name)
        if (search && typeof search === "string" && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            
            // Find users matching the search term
            const matchingUsers = await User.find({
                name: searchRegex
            }).select("_id");
            
            const userIds = matchingUsers.map(user => user._id);

            filter.$or = [
                { title: searchRegex },
                { content: searchRegex },
                { author: { $in: userIds } }
            ];
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [publications, total] = await Promise.all([
            Publication.find(filter)
                .populate("author", "name email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Publication.countDocuments(filter)
        ]);

        res.status(200).json({
            message: "Publications fetched successfully",
            data: publications,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error: any) {
        console.error("Error fetching all publications:", error);
        res.status(500).json({ message: error.message });
    }
};

// Get publication statistics
export const getPublicationStats = async (req: Request, res: Response) => {
    try {
        const [total, pending, approved, rejected, draft] = await Promise.all([
            Publication.countDocuments(),
            Publication.countDocuments({ status: "pending" }),
            Publication.countDocuments({ status: "approved" }),
            Publication.countDocuments({ status: "rejected" }),
            Publication.countDocuments({ status: "draft" })
        ]);

        res.status(200).json({
            message: "Statistics fetched successfully",
            data: {
                total,
                pending,
                approved,
                rejected,
                draft
            }
        });
    } catch (error: any) {
        console.error("Error fetching publication stats:", error);
        res.status(500).json({ message: error.message });
    }
};

// Delete any publication (admin only)
export const deletePublication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const publication = await Publication.findById(id).populate("author", "name email");

        if (!publication) {
            return res.status(404).json({ message: "Publication not found" });
        }

        const authorId = (publication.author as any)._id;
        const authorName = (publication.author as any).name;
        const publicationTitle = publication.title;

        // Delete the publication
        await Publication.findByIdAndDelete(id);

        // Notify the author
        await Notification.create({
            user: authorId,
            title: "Publication Deleted",
            message: `Your publication "${publicationTitle}" has been deleted by an administrator.${reason ? ` Reason: ${reason}` : ''}`,
            type: "publication"
        });

        res.status(200).json({
            message: "Publication deleted successfully",
            data: { id, title: publicationTitle, author: authorName }
        });
    } catch (error: any) {
        console.error("Error deleting publication:", error);
        res.status(500).json({ message: error.message });
    }
};

// Update any publication (admin only)
export const updatePublication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, category, status } = req.body;

        const publication = await Publication.findById(id);

        if (!publication) {
            return res.status(404).json({ message: "Publication not found" });
        }

        // Update fields
        if (title) publication.title = title;
        if (content) publication.content = content;
        if (category) publication.category = category;
        if (status && ["draft", "pending", "approved", "rejected"].includes(status)) {
            publication.status = status;
        }

        await publication.save();

        const updatedPublication = await Publication.findById(id).populate("author", "name email role");

        res.status(200).json({
            message: "Publication updated successfully",
            data: updatedPublication
        });
    } catch (error: any) {
        console.error("Error updating publication:", error);
        res.status(500).json({ message: error.message });
    }
};
