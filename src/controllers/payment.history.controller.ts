import { Request, Response } from "express";
import PaymentHistory from "../models/PaymentHistory";
import User from "../models/User";
import Event from "../models/Event";


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
// Admin: Get all event payments
export const getAdminEventPayments = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.query;
        
        let query: any = { type: "event" };
        if (eventId) {
            query["metadata.eventId"] = eventId;
        }

        const eventPayments = await PaymentHistory.find(query)
            .populate("user", "firstName lastName email profilePicture")
            .sort({ createdAt: -1 })
            .lean();

        // Get event details for each payment
        const paymentsWithEventDetails = await Promise.all(
            eventPayments.map(async (payment) => {
                if (payment.metadata?.eventId) {
                    const event = await Event.findById(payment.metadata.eventId)
                        .select("title date location price")
                        .lean();
                    return {
                        ...payment,
                        eventDetails: event
                    };
                }
                return payment;
            })
        );

        return res.status(200).json({
            success: true,
            count: paymentsWithEventDetails.length,
            payments: paymentsWithEventDetails,
        });
    } catch (error: any) {
        console.error("Error getting admin event payments:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get event payments",
            error: error.message || error,
        });
    }
};

// Admin: Get event payment statistics
export const getEventPaymentStats = async (req: Request, res: Response) => {
    try {
        const stats = await PaymentHistory.aggregate([
            { $match: { type: "event" } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        const eventStats = await PaymentHistory.aggregate([
            { $match: { type: "event" } },
            {
                $group: {
                    _id: "$metadata.eventId",
                    eventTitle: { $first: "$metadata.eventTitle" },
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    statuses: { $push: "$status" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            paymentStats: stats,
            eventStats: eventStats,
        });
    } catch (error: any) {
        console.error("Error getting event payment stats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get event payment statistics",
            error: error.message || error,
        });
    }
};