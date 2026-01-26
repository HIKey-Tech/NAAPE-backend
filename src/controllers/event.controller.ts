import Event from "../models/Event";
import Notification from "../models/Notification";
import PaymentHistory from "../models/PaymentHistory";
import { flw } from "../utils/flw.client";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { savePaymentHistory } from "../utils/savePaymentHistory";


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




// Accept both authed user and guest for event payment checkout link creation
export const registerEventPayment = async (req, res) => {

    console.log("BODY RECEIVED:", req.body);

    try {
        const { eventId } = req.body;

        const isGuest = !req.user;
        let userId: string | undefined;
        let email: string | undefined;
        let name: string | undefined;

        if (isGuest) {
            email = req.body.email;
            name = req.body.name;
        } else {
            userId = req.user.id;
            email = req.user.email;
            name = req.user.name;
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Free events: only authed users, no guests
        if (!event.isPaid || event.price === 0) {
            if (isGuest) {
                return res.status(400).json({ message: "Guests can't register for free events. Please sign up." });
            }
            // Compare using equals for ObjectId, not .includes on string
            if (!userId) {
                return res.status(400).json({ message: "User ID is required for registration." });
            }
            const userObjectId = new Types.ObjectId(userId);
            const alreadyRegistered = event.registeredUsers.some(
                (u) => u.equals(userObjectId)
            );
            if (!alreadyRegistered) {
                event.registeredUsers.push(userObjectId);
                await event.save();
            }
            return res.status(200).json({ message: "Registered (Free Event)" });
        }

        // Paid events: Payment link for user or guest.
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
                userId: userId || null,
                guest: isGuest
                    ? { name: name || null, email: email || null }
                    : null
            }
        };

        const response = await flw.post("/payments", payload);

        return res.status(200).json({
            link: response.data.data.link,
            tx_ref: response.data.data.tx_ref
        });

    } catch (error: any) {
        console.error("Flutterwave error:", error.response?.data || error);

        const message =
            (error?.response?.data?.message) ||
            error?.message ||
            "Payment initiation failed";
        return res.status(500).json({ message });
    }
}

// Update verifyEventPayment to handle guest registration & payment record using Event.ts guest fields
export const verifyEventPayment = async (req: Request, res: Response) => {
    try {
        const transaction_id = req.query.transaction_id as string;
        if (!transaction_id) {
            return res.status(400).json({ status: "failed", message: "Missing transaction_id" });
        }

        // Verify with Flutterwave
        const fwRes = await flw.get(`/transactions/${transaction_id}/verify`);
        const data = fwRes?.data?.data;

        if (!data || data.status !== "successful") {
            return res.status(400).json({ status: "failed" });
        }

        const { eventId, userId, guest } = data.meta || {};
        if (!eventId || (!userId && !guest)) {
            return res.status(400).json({ status: "failed", message: "Invalid metadata" });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: "failed", message: "Event not found" });
        }

        // Prevent duplicate processing
        const alreadyProcessed = event.payments.some(
            (p) => String(p.transactionId) === String(data.id)
        );
        if (!alreadyProcessed) {
            if (userId) {
                const userObjectId = new Types.ObjectId(userId);
                if (!event.registeredUsers.some((u) => u.equals(userObjectId))) {
                    event.registeredUsers.push(userObjectId);
                }

                event.payments.push({
                    user: userObjectId,
                    transactionId: data.id,
                    amount: data.amount,
                    status: data.status,
                    date: new Date(data.completed_at),
                });
            } else {
                event.payments.push({
                    guest: { name: guest.name, email: guest.email },
                    transactionId: data.id,
                    amount: data.amount,
                    status: data.status,
                    date: new Date(data.completed_at),
                });
            }

            await event.save();
        }

        // Payment history (idempotent)
        const historyExists = await PaymentHistory.findOne({ transactionId: data.id });
        if (!historyExists) {
            await savePaymentHistory(
                userId || null,
                "event",
                data.id,
                data.amount,
                data.currency,
                data.status,
                { eventId, guest }
            );
        }

        return res.json({ status: "success" });

    } catch (err) {
        console.error("Verify payment error:", err);
        return res.status(500).json({ status: "failed" });
    }
};

export const getEventPaymentStatus = async (req: Request, res: Response) => {
    try {
        const { eventId, email } = req.query;

        if (!eventId || !email) {
            return res.status(400).json({ message: "eventId and email are required" });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Check if payment exists for this user/guest
        const payment = event.payments.find((p) =>
            (p.user && p.user.toString() === email) ||  // if userId stored as email (adjust if you store ObjectId)
            (p.guest && p.guest.email === email)
        );

        if (!payment) {
            return res.status(200).json({ paid: false, status: "not found" });
        }

        return res.status(200).json({
            paid: payment.status === "successful",
            status: payment.status,
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};
