import { Request, Response } from "express";
import User from "../models/User";
import Publication from "../models/Publication";

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        // Users
        const totalUsers = await User.countDocuments();
        const totalMembers = await User.countDocuments({ role: "member" });
        const totalAdmins = await User.countDocuments({ role: "admin" });

        // Publications
        const totalPublications = await Publication.countDocuments();
        const pendingPublications = await Publication.countDocuments({ status: "pending" });
        const approvedPublications = await Publication.countDocuments({ status: "approved" });
        const rejectedPublications = await Publication.countDocuments({ status: "rejected" });

        return res.status(200).json({
            message: "Admin stats fetched successfully",
            data: {
                users: {
                    total: totalUsers,
                    members: totalMembers,
                    admins: totalAdmins,
                },
                publications: {
                    total: totalPublications,
                    pending: pendingPublications,
                    approved: approvedPublications,
                    rejected: rejectedPublications,
                },
            },
        });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};
