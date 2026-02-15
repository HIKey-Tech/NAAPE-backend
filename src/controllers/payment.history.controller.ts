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

// Admin: Get all member payments (subscription, membership, etc.)
export const getAdminMemberPayments = async (req: Request, res: Response) => {
    try {
        const { paymentType } = req.query;
        
        let query: any = { type: { $ne: "event" } }; // Exclude event payments
        if (paymentType && paymentType !== "all") {
            query.type = paymentType;
        }

        const memberPayments = await PaymentHistory.find(query)
            .populate("user", "firstName lastName email profilePicture")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: memberPayments.length,
            payments: memberPayments,
        });
    } catch (error: any) {
        console.error("Error getting admin member payments:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get member payments",
            error: error.message || error,
        });
    }
};

// Admin: Get comprehensive event payment analytics
export const getEventPaymentAnalytics = async (req: Request, res: Response) => {
    try {
        const { 
            eventId, 
            startDate, 
            endDate, 
            status,
            groupBy = 'day' 
        } = req.query;

        // Build base query
        let matchQuery: any = { type: "event" };
        
        if (eventId) {
            matchQuery["metadata.eventId"] = eventId;
        }
        
        if (status && status !== 'all') {
            matchQuery.status = status;
        }
        
        if (startDate || endDate) {
            matchQuery.createdAt = {};
            if (startDate) matchQuery.createdAt.$gte = new Date(startDate as string);
            if (endDate) matchQuery.createdAt.$lte = new Date(endDate as string);
        }

        // Get overall statistics
        const overallStats = await PaymentHistory.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalRevenue: { 
                        $sum: { 
                            $cond: [{ $eq: ["$status", "successful"] }, "$amount", 0] 
                        } 
                    },
                    totalPayments: { $sum: 1 },
                    successfulPayments: {
                        $sum: { $cond: [{ $eq: ["$status", "successful"] }, 1, 0] }
                    },
                    pendingPayments: {
                        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
                    },
                    failedPayments: {
                        $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
                    },
                    averageAmount: { $avg: "$amount" }
                }
            }
        ]);

        // Get revenue by event
        const revenueByEvent = await PaymentHistory.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: "$metadata.eventId",
                    eventTitle: { $first: "$metadata.eventTitle" },
                    totalRevenue: { 
                        $sum: { 
                            $cond: [{ $eq: ["$status", "successful"] }, "$amount", 0] 
                        } 
                    },
                    paymentCount: { $sum: 1 },
                    successfulCount: {
                        $sum: { $cond: [{ $eq: ["$status", "successful"] }, 1, 0] }
                    }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Get time-based analytics
        let dateGrouping: any;
        switch (groupBy) {
            case 'hour':
                dateGrouping = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                    hour: { $hour: "$createdAt" }
                };
                break;
            case 'day':
                dateGrouping = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                };
                break;
            case 'month':
                dateGrouping = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                };
                break;
            default:
                dateGrouping = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                };
        }

        const timeBasedAnalytics = await PaymentHistory.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: dateGrouping,
                    revenue: { 
                        $sum: { 
                            $cond: [{ $eq: ["$status", "successful"] }, "$amount", 0] 
                        } 
                    },
                    paymentCount: { $sum: 1 },
                    successfulCount: {
                        $sum: { $cond: [{ $eq: ["$status", "successful"] }, 1, 0] }
                    }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Get payment status distribution
        const statusDistribution = await PaymentHistory.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            analytics: {
                overall: overallStats[0] || {
                    totalRevenue: 0,
                    totalPayments: 0,
                    successfulPayments: 0,
                    pendingPayments: 0,
                    failedPayments: 0,
                    averageAmount: 0
                },
                revenueByEvent,
                timeBasedAnalytics,
                statusDistribution
            }
        });

    } catch (error: any) {
        console.error("Error getting event payment analytics:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get event payment analytics",
            error: error.message || error,
        });
    }
};

// Admin: Get filtered event payments with pagination
export const getFilteredEventPayments = async (req: Request, res: Response) => {
    try {
        const { 
            eventId,
            status,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        let query: any = { type: "event" };
        
        if (eventId && eventId !== 'all') {
            query["metadata.eventId"] = eventId;
        }
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        // Build sort options
        const sortOptions: any = {};
        sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const skip = (Number(page) - 1) * Number(limit);

        // Get payments with user and event details
        let payments = await PaymentHistory.find(query)
            .populate("user", "name email profile")
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Add event details and apply search filter
        const paymentsWithDetails = await Promise.all(
            payments.map(async (payment: any) => {
                let eventDetails: any = null;
                if (payment.metadata?.eventId) {
                    eventDetails = await Event.findById(payment.metadata.eventId)
                        .select("title date location price currency")
                        .lean();
                }

                const paymentWithDetails = {
                    ...payment,
                    eventDetails,
                    userName: payment.user?.name || 'Unknown',
                    userEmail: payment.user?.email || 'Unknown'
                };

                // Apply search filter if provided
                if (search) {
                    const searchTerm = (search as string).toLowerCase();
                    const matchesSearch = 
                        paymentWithDetails.userName.toLowerCase().includes(searchTerm) ||
                        paymentWithDetails.userEmail.toLowerCase().includes(searchTerm) ||
                        (eventDetails?.title || '').toLowerCase().includes(searchTerm) ||
                        payment.transactionId.toLowerCase().includes(searchTerm);
                    
                    return matchesSearch ? paymentWithDetails : null;
                }

                return paymentWithDetails;
            })
        );

        // Filter out null results from search
        const filteredPayments = paymentsWithDetails.filter(payment => payment !== null);

        // Get total count for pagination
        const totalQuery = search ? 
            PaymentHistory.find(query).populate("user", "name email") :
            PaymentHistory.countDocuments(query);
            
        let total;
        if (search) {
            // For search, we need to count after filtering
            const allPayments = await PaymentHistory.find(query)
                .populate("user", "name email")
                .lean();
            
            const searchTerm = (search as string).toLowerCase();
            total = allPayments.filter((payment: any) => {
                const userName = payment.user?.name || '';
                const userEmail = payment.user?.email || '';
                return userName.toLowerCase().includes(searchTerm) ||
                       userEmail.toLowerCase().includes(searchTerm) ||
                       payment.transactionId.toLowerCase().includes(searchTerm);
            }).length;
        } else {
            total = await PaymentHistory.countDocuments(query);
        }

        return res.status(200).json({
            success: true,
            payments: filteredPayments,
            pagination: {
                current: Number(page),
                total: Math.ceil(total / Number(limit)),
                count: filteredPayments.length,
                totalPayments: total
            }
        });

    } catch (error: any) {
        console.error("Error getting filtered event payments:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get filtered event payments",
            error: error.message || error,
        });
    }
};

// Admin: Export event payments data
export const exportEventPayments = async (req: Request, res: Response) => {
    try {
        const { 
            eventId,
            status,
            startDate,
            endDate,
            format = 'csv'
        } = req.query;

        // Build query
        let query: any = { type: "event" };
        
        if (eventId && eventId !== 'all') {
            query["metadata.eventId"] = eventId;
        }
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        // Get all matching payments
        const payments = await PaymentHistory.find(query)
            .populate("user", "name email profile")
            .sort({ createdAt: -1 })
            .lean();

        // Add event details
        const paymentsWithDetails = await Promise.all(
            payments.map(async (payment: any) => {
                let eventDetails: any = null;
                if (payment.metadata?.eventId) {
                    eventDetails = await Event.findById(payment.metadata.eventId)
                        .select("title date location")
                        .lean();
                }

                return {
                    'Transaction ID': payment.transactionId,
                    'User Name': payment.user?.name || 'Unknown',
                    'User Email': payment.user?.email || 'Unknown',
                    'Event Title': eventDetails?.title || payment.metadata?.eventTitle || 'Unknown',
                    'Event Date': eventDetails?.date ? new Date(eventDetails.date).toLocaleDateString() : 'Unknown',
                    'Event Location': eventDetails?.location || 'Unknown',
                    'Amount': payment.amount,
                    'Currency': payment.currency,
                    'Status': payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
                    'Payment Date': new Date(payment.createdAt).toLocaleDateString(),
                    'Payment Time': new Date(payment.createdAt).toLocaleTimeString()
                };
            })
        );

        if (format === 'csv') {
            // Generate CSV
            const headers = Object.keys(paymentsWithDetails[0] || {});
            const csvContent = [
                headers.join(','),
                ...paymentsWithDetails.map(payment => 
                    headers.map(header => `"${payment[header] || ''}"`).join(',')
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="event_payments_${new Date().toISOString().split('T')[0]}.csv"`);
            return res.send(csvContent);
        } else {
            // Return JSON for Excel conversion on frontend
            return res.status(200).json({
                success: true,
                data: paymentsWithDetails,
                filename: `event_payments_${new Date().toISOString().split('T')[0]}.xlsx`,
                totalRecords: paymentsWithDetails.length,
                exportDate: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error("Error exporting event payments:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export event payments",
            error: error.message || error,
        });
    }
};

// Admin: Get member payment statistics
export const getMemberPaymentStats = async (req: Request, res: Response) => {
    try {
        const stats = await PaymentHistory.aggregate([
            { $match: { type: { $ne: "event" } } }, // Exclude event payments
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        const typeStats = await PaymentHistory.aggregate([
            { $match: { type: { $ne: "event" } } }, // Exclude event payments
            {
                $group: {
                    _id: "$type",
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
            typeStats: typeStats,
        });
    } catch (error: any) {
        console.error("Error getting member payment stats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get member payment statistics",
            error: error.message || error,
        });
    }
};

// Admin: Get events summary for attendee management
export const getEventsForAttendeeManagement = async (req: Request, res: Response) => {
    try {
        const events = await Event.find()
            .select('title date location isPaid price currency registeredUsers payments')
            .sort({ date: -1 });

        const eventsSummary = events.map(event => ({
            _id: event._id,
            title: event.title,
            date: event.date,
            location: event.location,
            isPaid: event.isPaid,
            price: event.price || 0,
            currency: event.currency || 'NGN',
            registeredCount: event.registeredUsers?.length || 0,
            attendeeCount: event.registeredUsers?.length || 0
        }));

        return res.status(200).json({
            success: true,
            data: eventsSummary,
            message: "Events retrieved successfully"
        });

    } catch (error: any) {
        console.error("Get events for attendee management error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get events for attendee management",
            error: error.message || error,
        });
    }
};