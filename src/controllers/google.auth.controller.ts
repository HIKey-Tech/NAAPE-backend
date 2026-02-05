import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User";

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
);

export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: "Google credential is required"
            });
        }

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).json({
                success: false,
                message: "Invalid Google token"
            });
        }

        const { email, name, picture, sub: googleId, email_verified } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // User exists - update Google info if not set
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = "google";
                user.isVerified = email_verified || true;
                if (picture && !user.profile?.image?.url) {
                    user.profile = {
                        ...user.profile,
                        image: {
                            url: picture,
                            publicId: ""
                        }
                    };
                }
                await user.save();
            }
        } else {
            // Create new user
            user = await User.create({
                name: name || email.split("@")[0],
                email,
                googleId,
                authProvider: "google",
                isVerified: email_verified || true,
                profile: {
                    image: picture ? {
                        url: picture,
                        publicId: ""
                    } : undefined
                }
            });
        }

        // Generate JWT token
        const token = user.generateAuthToken();

        res.status(200).json({
            success: true,
            message: "Google authentication successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                profile: user.profile
            }
        });
    } catch (error: any) {
        console.error("Google Auth Error:", error);
        res.status(500).json({
            success: false,
            message: "Google authentication failed",
            error: error.message
        });
    }
};
