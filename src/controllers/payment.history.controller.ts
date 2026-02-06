import { Request, Response } from "express";
import PaymentHistory from "../models/PaymentHistory";


export const getPaymentHistory = async (req: Request, res: Response) => {
    try {
        console.log("\n=== PAYMENT HISTORY REQUEST ===");
        console.log("Timestamp:", new Date().toISOString());
        console.log("Request params userId:", req.params.userId);
        console.log("Request user from auth:", req.user);
        console.log("Request headers:", {
            authorization: req.headers.authorization,
            contentType: req.headers['content-type']
        });

        const userId = req.params.userId;
        if (!userId) {
            console.log("❌ ERROR: User ID is missing");
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        console.log("🔍 Querying PaymentHistory with userId:", userId);
        
        // Get all payment history for debugging
        const allHistory = await PaymentHistory.find({}).lean();
        console.log("📊 Total payment records in database:", allHistory.length);
        console.log("📊 All user IDs in database:", allHistory.map(h => h.user.toString()));
        
        const history = await PaymentHistory.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        console.log("✅ Payment history found for user:", history.length);
        console.log("📦 Payment history data:", JSON.stringify(history, null, 2));

        return res.status(200).json({
            success: true,
            count: history.length,
            history,
        });
    } catch (error: any) {
        console.error("❌ ERROR getting payment history:", error);
        console.error("Error stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: "Failed to get payment history",
            error: error.message || error,
        });
    }
};
