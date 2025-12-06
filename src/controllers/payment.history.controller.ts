import { Request, Response } from "express";
import PaymentHistory from "../models/PaymentHistory";

/**
 * Get all payment history for a user
 * GET /api/payments/history/:userId
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const history = await PaymentHistory.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: history.length,
            history,
        });
    } catch (error: any) {
        console.error("Error getting payment history:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get payment history",
            error: error.message || error,
        });
    }
};
