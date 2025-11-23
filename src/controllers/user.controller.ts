import { Request, Response } from "express";
import User from "../models/User";
import Publication from "../models/Publication";

export const getProfile = async (req: any, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const user = await User.findById(userId)
            .select("-password")
            .lean();

        if (!user) return res.status(404).json({ message: "User not found" });

        // Add stats
        const total = await Publication.countDocuments({ author: userId });
        const approved = await Publication.countDocuments({ author: userId, status: "approved" });
        const pending = await Publication.countDocuments({ author: userId, status: "pending" });

        res.status(200).json({
            message: "Profile fetched successfully",
            data: {
                ...user,
                stats: { total, approved, pending },
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json({
            message: "Users fetched successfully",
            count: users.length,
            data: users,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message })

    }
}

export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Cannot promote yourself accidentally
        if (id === (req as any).user?.id) {
            return res.status(400).json({
                message: "You cannot change your own role",
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { role: "admin" },
            { new: true }
        ).select("-password");

        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
            message: "User successfully promoted to admin",
            user,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


// ADMIN: Fetch all MEMBERS only
export const getAllMembers = async (req: Request, res: Response) => {
    try {
        const members = await User.find({ role: "member" })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Members fetched successfully",
            count: members.length,
            data: members,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

