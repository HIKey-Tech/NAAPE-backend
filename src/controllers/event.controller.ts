import Event from "../models/Event";
import Notification from "../models/Notification";
import PaymentHistory from "../models/PaymentHistory";
import { flw } from "../utils/flw.client";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { savePaymentHistory } from "../utils/savePaymentHistory";
import sendEmail from "../utils/sendEmail";
import { eventPaymentEmail } from "../utils/emailTemplates";
import { eventPaymentEmailHTML } from "../utils/emailTemplatesHTML";
import User from "../models/User";


export const createEvent = async (req, res) => {
    try {
        // TEXT FIELDS from multipart/form-data
        const {
            title,
            date,
            location,
            currency,
            description,
            isPaid,
            price
        } = req.body;

        // IMAGE FILE OR FALLBACK URL
        const imageUrl = req.file ? req.file.path : req.body.image || null;

        const adminId = req.user.id;

        

        const event = await Event.create({
            title,
            date,
            location,
            imageUrl,
            currency,
            description,
            createdBy: adminId,
            isPaid,
            price
        });

        await Notification.create({
            title: "New Event Created",
            message: `${title} - happening on ${date}.`,
            type: "event",
            user: req.user._id,
        });

        res.status(201).json({
            message: "Event created successfully",
            event
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.status(200).json(events);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSingleEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) return res.status(404).json({ message: "Event not found" });

        res.status(200).json(event);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};




// Authenticated users only - register for event payment
export const registerEventPayment = async (req, res) => {
    try {
        const { eventId } = req.body;
        const userId = req.user.id;
        const email = req.user.email;
        const name = req.user.name;

        if (!userId || !email || !name) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const userObjectId = new Types.ObjectId(userId);

        // Free events: register directly
        if (!event.isPaid || event.price === 0) {
            const alreadyRegistered = event.registeredUsers.some(
                (u) => u.equals(userObjectId)
            );
            if (!alreadyRegistered) {
                event.registeredUsers.push(userObjectId);
                await event.save();
            }
            return res.status(200).json({ message: "Registered for free event" });
        }

        // Check if already paid
        const alreadyPaid = event.payments.some(
            (p) => p.user.equals(userObjectId) && p.status === "successful"
        );
        if (alreadyPaid) {
            return res.status(400).json({ message: "You have already paid for this event" });
        }

        // Paid events: create payment link
        const tx_ref = `EVT-${eventId}-${Date.now()}`;
        const payload = {
            tx_ref,
            amount: event.price,
            currency: event.currency,
            redirect_url: `${process.env.FRONTEND_URL}/events/${eventId}/payment-complete`,
            customer: {
                email,
                name
            },
            meta: {
                eventId,
                userId
            }
        };

        const response = await flw.post("/payments", payload);

        return res.status(200).json({
            link: response.data.data.link,
            tx_ref: response.data.data.tx_ref
        });

    } catch (error: any) {
        console.error("Event payment error:", error.response?.data || error);
        const message = error?.response?.data?.message || error?.message || "Payment initiation failed";
        return res.status(500).json({ message });
    }
}

// Verify event payment - authenticated users only
export const verifyEventPayment = async (req: Request, res: Response) => {
    try {
        const transaction_id = req.query.transaction_id as string;
        
        if (!transaction_id || transaction_id.trim() === "") {
            return res.status(400).json({ 
                status: "failed", 
                message: "Transaction ID is required for payment verification" 
            });
        }

        // Verify with Flutterwave
        let fwRes;
        try {
            fwRes = await flw.get(`/transactions/${transaction_id}/verify`);
        } catch (flwError: any) {
            console.error("Flutterwave API error:", flwError.message);
            
            if (flwError.code === 'ECONNREFUSED' || flwError.code === 'ETIMEDOUT' || flwError.code === 'ENOTFOUND') {
                return res.status(500).json({
                    status: "failed",
                    message: "Payment verification service is temporarily unavailable. Please try again in a few moments."
                });
            }
            
            if (flwError.response?.status === 404) {
                return res.status(404).json({
                    status: "failed",
                    message: "Transaction not found. Please verify your transaction ID.",
                    transactionId: transaction_id
                });
            }
            
            return res.status(500).json({
                status: "failed",
                message: "Unable to verify payment at this time. Please try again later or contact support."
            });
        }
        
        const data = fwRes?.data?.data;

        if (!data || data.status !== "successful") {
            return res.status(400).json({ 
                status: "failed",
                message: "Payment was not successful",
                transactionId: data?.id || transaction_id
            });
        }

        const { eventId, userId } = data.meta || {};
        if (!eventId || !userId) {
            return res.status(400).json({ 
                status: "failed", 
                message: "Invalid payment metadata - user authentication required",
                transactionId: data.id
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ 
                status: "failed", 
                message: "Event not found",
                transactionId: data.id
            });
        }

        // Prevent duplicate processing
        const alreadyProcessed = event.payments.some(
            (p) => String(p.transactionId) === String(data.id)
        );
        
        if (!alreadyProcessed) {
            const userObjectId = new Types.ObjectId(userId);
            
            // Add to registered users if not already there
            if (!event.registeredUsers.some((u) => u.equals(userObjectId))) {
                event.registeredUsers.push(userObjectId);
            }

            // Parse payment date safely
            let paymentDate = new Date();
            if (data.completed_at) {
                const parsedDate = new Date(data.completed_at);
                if (!isNaN(parsedDate.getTime())) {
                    paymentDate = parsedDate;
                }
            }

            // Add payment record
            event.payments.push({
                user: userObjectId,
                transactionId: data.id,
                amount: data.amount,
                status: data.status,
                date: paymentDate,
            });

            await event.save();
        }

        // Payment history (idempotent)
        const historyExists = await PaymentHistory.findOne({ transactionId: data.id });
        if (!historyExists) {
            try {
                await savePaymentHistory(
                    userId,
                    "event",
                    data.id,
                    data.amount,
                    data.currency,
                    data.status,
                    { eventId, eventTitle: event.title }
                );
            } catch (historyError) {
                console.error("Failed to save payment history:", historyError);
                // Continue - payment is recorded in event
            }
        }

        // Send confirmation email
        try {
            const user = await User.findById(userId);
            if (user) {
                const emailContent = eventPaymentEmail(
                    user.name,
                    event.title,
                    event.date,
                    event.location,
                    data.amount,
                    data.currency,
                    data.id
                );

                const htmlContent = eventPaymentEmailHTML(
                    user.name,
                    event.title,
                    event.date,
                    event.location,
                    data.amount,
                    data.currency,
                    data.id
                );

                await sendEmail({
                    to: user.email,
                    subject: emailContent.subject,
                    text: emailContent.text,
                    html: htmlContent,
                });
            }
        } catch (emailError) {
            console.error("Failed to send event confirmation email:", emailError);
        }

        return res.json({ 
            status: "successful",
            message: "Payment verified successfully",
            transactionId: data.id,
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                location: event.location,
                imageUrl: event.imageUrl
            }
        });

    } catch (err) {
        console.error("Verify payment error:", err);
        return res.status(500).json({ 
            status: "failed",
            message: "Payment verification failed"
        });
    }
};

export const getEventPaymentStatus = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.query;
        const userId = req.user?.id;

        if (!eventId) {
            return res.status(400).json({ message: "eventId is required" });
        }

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const userObjectId = new Types.ObjectId(userId);

        // Check if user has paid for this event
        const payment = event.payments.find((p) =>
            p.user.equals(userObjectId) && p.status === "successful"
        );

        if (!payment) {
            return res.status(200).json({ 
                paid: false, 
                registered: event.registeredUsers.some(u => u.equals(userObjectId))
            });
        }

        return res.status(200).json({
            paid: true,
            status: payment.status,
            amount: payment.amount,
            transactionId: payment.transactionId,
            date: payment.date
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const getUserEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const userObjectId = new Types.ObjectId(userId);

        // Find all events where user is registered
        const events = await Event.find({
            registeredUsers: userObjectId
        }).sort({ date: -1 });

        // Add payment info for each event
        const eventsWithPaymentInfo = events.map(event => {
            const payment = event.payments.find(p => 
                p.user.equals(userObjectId) && p.status === "successful"
            );

            return {
                ...event.toObject(),
                userPayment: payment ? {
                    amount: payment.amount,
                    transactionId: payment.transactionId,
                    date: payment.date
                } : null
            };
        });

        return res.status(200).json({
            success: true,
            count: eventsWithPaymentInfo.length,
            events: eventsWithPaymentInfo
        });
    } catch (error: any) {
        console.error("Get user events error:", error);
        return res.status(500).json({ message: error.message });
    }
};
