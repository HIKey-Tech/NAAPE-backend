import { Request, Response } from "express";
import Publication from "../models/Publication";

export const getMemberDashboardStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id?.toString();


        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No user ID found" });
        }

        const total = await Publication.countDocuments({ author: userId });
        const pending = await Publication.countDocuments({ author: userId, status: "pending" });
        const approved = await Publication.countDocuments({ author: userId, status: "approved" });
        const rejected = await Publication.countDocuments({ author: userId, status: "rejected" });

        res.status(200).json({
            message: "Member dashboard stats fetched successfully",
            data: {
                total,
                pending,
                approved,
                rejected,
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
