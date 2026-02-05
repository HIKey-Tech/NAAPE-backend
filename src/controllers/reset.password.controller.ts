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

    // Check if user is Google-authenticated
    if (user.authProvider === "google" && !user.password) {
        return res.status(400).json({
            message: "This account uses Google Sign-In. Please sign in with Google.",
        });
    }

    const resetToken = user.getResetPasswordToken();
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

export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
        message: "Password reset successful",
    });
};
