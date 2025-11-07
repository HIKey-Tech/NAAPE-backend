import { Request, Response } from "express";
import User from "../models/User";
import { generateToken } from "../utils/generateToken";

export const registerUser = async (req: Request, res: Response) => { 
    try {
        const { name, email, password, role } = req.body;
        const user = await User.create({ name, email, password, role });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id as string, user.role as "admin" | "editor" | "member"),
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const loginUser = async (req: Request, res: Response) => { 
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchePassword(password))) {
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id as string, user.role as "admin" | "editor" | "member"),
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}
