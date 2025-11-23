import { Request, Response } from "express";
import Publication from "../models/Publication"
import { request } from "http";
import Notification from "../models/Notification";


//Create new publication (Member)
export const createPublication = async (req: Request, res: Response) => {
    try {
        const { title, content, category, image: imageUrl } = req.body;
        const authorId = (req as any).user?.id;
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
        res.status(500).json({ message: error.message })
    }
};

//Fetch all approved publications (Public)
export const getAllPublications = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        const filter: any = {};

        // Only apply status filter if provided AND valid
        if (status && ["approved"].includes(status as string)) {
            filter.status = status;
        }

        const publications = await Publication.find(filter).populate(
            "author", "name email role"
        );

        res.status(200).json({
            message: "All publications fetched successfully",
            count: publications.length,
            data: publications,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });

    }
};

// // Fetch ALL publications (Admin Only)
// export const getAllPublications = async (req: Request, res: Response) => {
//     try {
//         const publications = await Publication.find()
//             .populate("author", "name email role")
//             .sort({ createdAt: -1 });

//         res.status(200).json({
//             message: "All publications fetched successfully",
//             count: publications.length,
//             data: publications,
//         });

//     } catch (error: any) {
//         res.status(500).json({ message: error.message });
//     }
// };


//Admin or Editor approves publication
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

        res.status(200).json({ message: "Publication approved", publication })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
};

//Admin rejects publication
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

        res.status(200).json({ message: "Publication rejected", publication })
    } catch (error: any) {
        res.status(500).json({ message: error.message })

    }
}

//Fetch publications create by the logged-in user
export const getMyPublications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;

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