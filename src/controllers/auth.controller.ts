import { Request, Response } from "express";
import User from "../models/User";
import { generateToken } from "../utils/generateToken";
// import { OAuth2Client } from "google-auth-library";

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.create({ name, email: normalizedEmail, password, role });

        res.status(201).json({
            message: "Account Created successfully",
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id as string, user.role as "admin" | "editor" | "member"),
        });
    } catch (error: any) {
        // ✅ Handle duplicate email error
        if (error.code === 11000 && error.keyPattern?.email) {
            return res.status(409).json({
                message: "Email already exists",
            });
        }
        res.status(500).json({ message: error.message });
    }
}

export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check if user is Google-only (no password set)
        if (user.authProvider === "google" && !user.password) {
            return res.status(400).json({ 
                message: "This account uses Google Sign-In. Please sign in with Google." 
            });
        }

        if (await user.matchePassword(password)) {
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id as string, user.role as "admin" | "editor" | "member"),
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}


// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// // Handle Google Sign-In
// export const googleAuth = async (req: Request, res: Response) => {
//     const { credential } = req.body; // Google ID Token

//     try {
//         // Verify token
//         const ticket = await client.verifyIdToken({
//             idToken: credential,
//             audience: process.env.GOOGLE_CLIENT_ID,
//         });

//         const payload = ticket.getPayload();
//         if (!payload) {
//             return res.status(400).json({ message: "Invalid Google token" });
//         }

//         const { email, name, picture, sub } = payload;
//         const normalizedEmail = email.trim().toLowerCase();

//         // Check if user exists
//         let user = await User.findOne({ email: normalizedEmail });

//         if (!user) {
//             // Create a new user
//             user = await User.create({
//                 name,
//                 email: normalizedEmail,
//                 password: sub, // not used, but required to satisfy schema
//                 role: "member",
//                 avatar: picture
//             });
//         }

//         // Generate JWT
//         const token = jwt.sign(
//             { id: user._id, role: user.role },
//             process.env.JWT_SECRET!,
//             { expiresIn: "30d" }
//         );

//         res.status(200).json({
//             message: "Google login successful",
//             user,
//             token,
//         });
//     } catch (error: any) {
//         res.status(500).json({ message: error.message });
//     }
// };

