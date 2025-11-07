import { Request, Response } from "express";
import User from "../models/User";

export const getProfile = async (req: any, res: Response) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message})
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message})
        
    }
}