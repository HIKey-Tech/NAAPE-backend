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
        const image = req.file ? req.file.path : req.body.image || null;

        const adminId = req.user.id;

        const event = await Event.create({
            title,
            date,
            location,
            image,
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
            user: null,
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
    try {
        const eventId = req.params.id;
        // Guest: req.body.email and req.body.name required if no req.user
        const guestMode = !req.user;
        let userId, email, name;
        if (!guestMode) {
            userId = req.user.id;
            email = req.user.email;
            name = req.user.name;
        } else {
            email = req.body.email;
            name = req.body.name;
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Free events: allow only registered users (authed, not guest) to join instantly
        if (!event.isPaid || event.price === 0) {
            if (guestMode) {
                return res.status(400).json({ message: "Guests can't register for free events. Please sign up." });
            }
            if (!event.registeredUsers.includes(userId)) {
                event.registeredUsers.push(userId);
                await event.save();
            }
            return res.status(200).json({ message: "Registered (Free Event)" });
        }

        // Paid event: create payment link for both user and guest
        const tx_ref = `EVT-${eventId}-${Date.now()}`;
        const payload = {
            tx_ref,
            amount: event.price,
            currency: event.currency,
            redirect_url: `${process.env.FRONTEND_URL}/events/${eventId}/payment-complete`,
            customer: {
                email, name
            },
            meta: {
                eventId,
                userId: userId || null,
                guest: guestMode ? { name, email } : null 
            }
        };

        // Use flw client directly to hit /payments endpoint
        const response = await flw.post("/payments", payload);

        return res.status(200).json({
            link: response.data.data.link,
            tx_ref: response.data.data.tx_ref
        });

    } catch (error: any) {
        const message =
            (error?.response && error.response.data && error.response.data.message) ||
            error?.message ||
            "Payment initiation failed";
        return res.status(500).json({ message });
    }
}

// Update verifyEventPayment to handle guest registration & payment record using Event.ts guest fields
export const verifyEventPayment = async (req: Request, res: Response) => {
    try {
        const transaction_id = req.query.transaction_id as string | undefined;
        if (!transaction_id) {
            return res.status(400).json({ message: "Missing transaction_id in query" });
        }

        // Call flutterwave API to verify transaction
        const verificationRes = await flw.get(`/transactions/${transaction_id}/verify`);
        const data = verificationRes?.data?.data;

        if (!data) {
            return res.status(502).json({ message: "Could not verify transaction" });
        }

        if (data.status !== "successful") {
            return res.status(400).json({ message: "Payment not successful", data });
        }

        // eventId always in meta. userId (for authed) or guest (for guest) present
        const eventId = data.meta?.eventId;
        const userId = data.meta?.userId || undefined;
        const guestInfo = data.meta?.guest || undefined;
        if (!eventId || (!userId && !guestInfo)) {
            return res.status(400).json({ message: "Event or payer metadata missing from transaction" });
        }

        // Find event and check registration/payment state
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        let paymentExists = event.payments.some(
            (p) => String(p.transactionId) === String(data.id)
        );

        // Register user or guest IF not already registered
        if (userId) {
            // User registration (ObjectId for matching)
            const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
            if (!event.registeredUsers.some((u) => u.equals(userObjectId))) {
                event.registeredUsers.push(userObjectId);
            }

            // Payment record for user
            if (!paymentExists) {
                event.payments.push({
                    user: userObjectId,
                    transactionId: data.id,
                    amount: data.amount,
                    status: data.status,
                    date: data.completed_at ? new Date(data.completed_at) : new Date()
                });
            }
        } else if (guestInfo) {
            // Guest registration (do not push to registeredUsers array!)
            // Payment record for guest
            const guestAlreadyPaid = event.payments.some(
                (p) =>
                    p.guest?.email === guestInfo.email &&
                    p.transactionId === data.id
            );
            if (!guestAlreadyPaid && !paymentExists) {
                event.payments.push({
                    guest: {
                        name: guestInfo.name,
                        email: guestInfo.email
                    },
                    transactionId: data.id,
                    amount: data.amount,
                    status: data.status,
                    date: data.completed_at ? new Date(data.completed_at) : new Date()
                });
            }
        }

        // Only mark as paid if this is a paid event
        if (event.isPaid !== true) {
            event.isPaid = true;
        }

        await event.save();

        // Save payment history
        await savePaymentHistory(
            (userId ? data.customer.id : guestInfo?.email),
            "event",
            data.id,
            data.amount,
            data.currency,
            data.status,
            {
                eventId,
                guest: guestInfo ? { name: guestInfo.name, email: guestInfo.email } : undefined
            }
        );

        return res.status(200).json({
            message: "Payment verified & registration complete",
            event,
        });
    } catch (error: any) {
        console.error("Payment verification error:", error?.response?.data || error?.message || error);
        return res.status(500).json({ error: "Payment verification failed" });
    }
};