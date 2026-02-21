import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcrypt";
import Publication from "../models/Publication";
import cloudinary from "../config/cloudinary";

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

export const updateProfile = async (req, res) => {
    try {
        console.log("=== UPDATE PROFILE DEBUG ===");
        console.log("User ID:", req.user?.id);
        console.log("Request body:", req.body);
        console.log("Request file:", req.file);

        const user = await User.findById(req.user.id);
        if (!user) {
            console.error("User not found:", req.user.id);
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Current user profile:", user.profile);
        console.log("Current user professional:", user.professional);

        // Update flat fields
        if (req.body.name) {
            user.name = req.body.name;
        }

        // Update profile object
        if (req.body.profile) {
            try {
                const parsedProfile = JSON.parse(req.body.profile);
                console.log("Parsed profile:", parsedProfile);

                // Remove any undefined, null, or "undefined" string values
                const cleanedProfile = Object.fromEntries(
                    Object.entries(parsedProfile).filter(([key, value]) => {
                        // Skip image field entirely - it's handled separately
                        if (key === 'image') return false;
                        // Skip undefined, null, or string "undefined"
                        if (value === undefined || value === null || value === "undefined") return false;
                        return true;
                    })
                );

                console.log("Cleaned profile:", cleanedProfile);

                // Preserve existing image
                const currentImage = user.profile?.image;

                // Update only the fields that are provided, keeping existing values for others
                user.profile = {
                    image: currentImage, // Always preserve the image first
                    specialization: user.profile?.specialization,
                    bio: user.profile?.bio,
                    organization: user.profile?.organization,
                    phone: user.profile?.phone,
                    ...cleanedProfile, // Override with new values
                };

                console.log("Updated user profile:", user.profile);
            } catch (parseError: any) {
                console.error("Profile parse error:", parseError);
                return res.status(400).json({ message: "Invalid profile data format", error: parseError?.message || "Parse error" });
            }
        }

        // Update professional object
        if (req.body.professional) {
            try {
                const parsedProfessional = JSON.parse(req.body.professional);
                console.log("Parsed professional:", parsedProfessional);

                user.professional = {
                    ...user.professional,
                    ...parsedProfessional,
                };

                console.log("Updated user professional:", user.professional);
            } catch (parseError: any) {
                console.error("Professional parse error:", parseError);
                return res.status(400).json({ message: "Invalid professional data format", error: parseError?.message || "Parse error" });
            }
        }

        // Handle image replacement
        if (req.file) {
            // Delete old image from Cloudinary
            if (user.profile?.image?.publicId) {
                try {
                    await cloudinary.uploader.destroy(user.profile.image.publicId);
                } catch (cloudinaryError) {
                    console.error("Failed to delete old image from Cloudinary:", cloudinaryError);
                    // Continue anyway - don't fail the update
                }
            }

            // Set new image
            user.profile.image = {
                url: req.file.path,
                publicId: req.file.filename || req.file.public_id,
            };
        }

        console.log("Attempting to save user...");
        await user.save();
        console.log("User saved successfully");

        const sanitizedUser = await User.findById(user._id).select("-password");
        res.status(200).json({
            message: "Profile updated successfully",
            data: sanitizedUser,
        });
    } catch (error: any) {
        console.error("=== UPDATE PROFILE ERROR ===");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Full error:", error);
        
        res.status(500).json({
            message: "Profile update failed",
            error: error?.message || "Unknown error occurred",
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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

//Change password
export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword, confirmPassword } = req.body;

        // 1️⃣ Validate inputs
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match." });
        }

        // 2️⃣ Get user WITH password
        const user = await User.findById(userId).select("+password");

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if user has a password (not Google-only user)
        if (!user.password) {
            return res.status(400).json({
                message: "Cannot change password for Google-authenticated accounts."
            });
        }

        // 3️⃣ Compare current password
        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        // 4️⃣ Prevent password reuse
        const sameAsOld = await bcrypt.compare(newPassword, user.password);
        if (sameAsOld) {
            return res.status(400).json({ message: "New password must be different." });
        }

        // 5️⃣ Update password (hash via pre-save hook)
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully." });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Failed to update password." });
    }
};



export const getPublicProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select("name role profile specialization bio organization updatedAt createdAt")
            .lean();

        if (!user) return res.status(404).json({ message: "User not found" });

        // Add stats (only approved ones for public profile)
        const approvedPublications = await Publication.countDocuments({ author: id, status: "approved" });

        res.status(200).json({
            message: "Public profile fetched successfully",
            data: {
                ...user,
                stats: { approved: approvedPublications },
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
