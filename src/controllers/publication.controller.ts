import { Types } from "mongoose";
import { Request, Response } from "express";
import Publication from "../models/Publication";
import Notification from "../models/Notification";
import mongoose from "mongoose";

// Create new publication (Member)
export const createPublication = async (req: Request, res: Response) => {
    try {
        const { title, content, category, image: imageUrl } = req.body;
        const authorId = (req as any).user?.id || (req.user && (req.user as any)._id);
        const image = (req as any).file?.path || imageUrl || null;

        const publication = await Publication.create({
            title,
            content,
            category,
            image,
            author: authorId,
        });
        res.status(201).json({
            message: "Publication submitted successfully and awaiting approval.",
            data: publication,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch all approved publications (Public)
export const getAllPublications = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        const filter: any = {};

        // Only apply status filter if provided AND valid
        if (status && ["approved"].includes(status as string)) {
            filter.status = status;
        }

        const publications = await Publication.find(filter)
            .populate("author", "name email role");

        res.status(200).json({
            message: "All publications fetched successfully",
            count: publications.length,
            data: publications,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Admin or Editor approves publication
export const approvedPublication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const publication = await Publication.findByIdAndUpdate(
            id,
            { status: "approved" },
            { new: true }
        );

        if (!publication) return res.status(404).json({ message: "Not found" });

        await Notification.create({
            user: publication.author,
            title: "Publication Approved",
            message: `"${publication.title}" has been approved by NAAPE admins.`,
            type: "publication",
        });

        res.status(200).json({ message: "Publication approved", publication });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Admin rejects publication
export const rejectPublication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const publication = await Publication.findByIdAndUpdate(
            id,
            { status: "rejected" },
            { new: true }
        );

        if (!publication) return res.status(404).json({ message: "Not found" });

        await Notification.create({
            user: publication.author,
            title: "Publication Rejected",
            message: `"${publication.title}" has been rejected by NAAPE admins.`,
            type: "publication",
        });

        res.status(200).json({ message: "Publication rejected", publication });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch publications created by the logged-in user
export const getMyPublications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id || (req.user && (req.user as any)._id);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User not authenticated" });
        }

        const { status } = req.query;
        const allowedStatuses = ["pending", "approved", "rejected"];
        const filter: Record<string, any> = { author: userId };

        if (typeof status === "string" && allowedStatuses.includes(status)) {
            filter.status = status;
        }

        const publications = await Publication.find(filter)
            .populate("author", "name email role")
            .sort({ createdAt: -1 })
            .select("title category status image createdAt updatedAt content");

        return res.status(200).json({
            message: "Successfully fetched your publications",
            count: publications.length,
            data: publications,
        });

    } catch (error: any) {
        console.error("Error fetching user's publications:", error);
        return res.status(500).json({ message: "An error occurred while fetching your publications", error: error.message });
    }
};

// Public: Fetch a single publication by id (everyone can view approved publications; owners can view their own pending/rejected)
export const getSinglePublication = async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
    }

    try {
        const publication = await Publication.findById(req.params.id).populate("author", "name email role");

        if (!publication) {
            return res.status(404).json({ message: "Publication not found" })
        }

        //Get logged-in user if exists (optional auth)
        const userId = (req as any).user?._id ||
            (req.user && (req.user as any)._id) ||
            null;

        // If author is populated, _id is a property of the author object
        // Fix TypeScript errors due to ambiguous author type (ObjectId | IUser)

        let authorId: string | null = null;
        if (
            publication.author &&
            typeof publication.author === "object" &&
            "_id" in publication.author
        ) {
            // author is populated
            authorId = (publication.author as any)._id.toString();
        } else if (
            publication.author &&
            (typeof publication.author === "string" ||
                publication.author instanceof Types.ObjectId)
        ) {
            // author is ObjectId or string
            authorId = publication.author.toString();
        }

        const isAuthor =
            !!userId &&
            !!authorId &&
            authorId.toString() === userId.toString();

        //if not approved and not author then block
        if (publication.status !== "approved" && !isAuthor) {
            return res.status(403).json({
                message: "This publication is not available for public view"
            })
        }

        return res.status(200).json({
            message: "Publication fetched successfully",
            data: publication
        })
    } catch (error: any) {
        return res.status(500).json({ message: error.message })

    }
}

// Update my publication
export const updateMyPublication = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id || (req.user && (req.user as any)._id);
        const publicationId = req.params.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User not authenticated" });
        }

        if (!publicationId) {
            return res.status(400).json({ message: "Publication ID is required" });
        }

        const publication = await Publication.findOne({ _id: publicationId, author: userId });
        if (!publication) {
            return res.status(404).json({ message: "Publication not found or you do not have permission to edit it" });
        }

        // Only allow edits when status is "pending" or "rejected"
        if (publication.status === "approved") {
            return res.status(403).json({ message: "Cannot edit an approved publication." });
        }

        const { title, content, category, image: imageUrl } = req.body;
        const newImage = (req as any).file?.path || imageUrl || publication.image;

        publication.title = title ?? publication.title;
        publication.content = content ?? publication.content;
        publication.category = category ?? publication.category;
        publication.image = newImage;

        // Reset status to pending on update
        publication.status = "pending";
        await publication.save();

        res.status(200).json({
            message: "Publication updated successfully and is pending approval.",
            data: publication,
        });
    } catch (error: any) {
        console.error("Error updating publication:", error);
        return res.status(500).json({ message: "An error occurred while updating your publication", error: error.message });
    }
};

// Delete my publication
export const deleteMyPublication = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id || (req.user && (req.user as any)._id);
        const publicationId = req.params.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User not authenticated" });
        }

        if (!publicationId) {
            return res.status(400).json({ message: "Publication ID is required" });
        }

        const publication = await Publication.findOneAndDelete({
            _id: publicationId,
            author: userId,
            status: { $ne: "approved" } // Allow deletion if NOT approved
        });

        if (!publication) {
            return res.status(404).json({ message: "Publication not found, you do not have permission to delete it, or it has already been approved." });
        }

        return res.status(200).json({
            message: "Publication deleted successfully.",
            data: publication,
        });
    } catch (error: any) {
        console.error("Error deleting publication:", error);
        return res.status(500).json({ message: "An error occurred while deleting your publication", error: error.message });
    }
};
