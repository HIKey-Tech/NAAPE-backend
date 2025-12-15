import crypto from "crypto";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";

export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(200).json({
            message: "If this email exists, a reset link has been sent",
        });
    }

    const resetToken = user.resetPasswordToken;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
    You requested a password reset.
    Click the link below to reset your password:
    ${resetUrl}

    This link expires in 15 minutes.
  `;

    try {
        await sendEmail({
            to: user.email,
            subject: "NAAPE Password Reset",
            text: message,
        });

        res.status(200).json({
            message: "Password reset link sent to email",
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(500).json({ message: "Email could not be sent" });
    }
};
