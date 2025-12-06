import Event from "../models/Event";
import Notification from "../models/Notification";
import PaymentHistory from "../models/PaymentHistory";
import { flw } from "../utils/flw.client";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { savePaymentHistory } from "../utils/savePaymentHistory";


export const createEvent = async (req, res) => {
    try {
        const { title, date, location, currency, image: imageUrl, description, isPaid, price } = req.body;
        const adminId = req.user.id;
        const image = (req as any).file?.path || imageUrl || null

        const event = await Event.create({
            title,
            date,
            location,
            image,
            currency,
            description,
            createdBy: adminId,
            isPaid, price
        });

        // Send notification to all users (system-wide notification)
        await Notification.create({
            title: "New Event Created",
            message: `${title} - happening on ${date}.`,
            type: "event",
            user: null,
        });

        res.status(201).json({ message: "Event created successfully", event });
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




export const registerEventPayment = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // If free, register instantly
        if (!event.isPaid || event.price === 0) {
            if (!event.registeredUsers.includes(userId)) {
                event.registeredUsers.push(userId);
                await event.save();
            }
            return res.status(200).json({ message: "Registered (Free Event)" });
        }

        //create payment link
        const payload = {
            tx_ref: `EVT-${eventId}-${Date.now()}`,
            amount: event.price,
            currency: event.currency,
            redirect_url: `${process.env.FRONTEND_URL}/events/${eventId}/payment-complete`,
            customer: {
                email: req.user.email,
                name: req.user.name,
            },
            meta: {
                eventId,
                userId
            }
        };

        // Store pending registration
        // await EventRegistration.create({
        //     eventId,
        //     userName,
        //     email,
        //     amountPaid: amount,
        //     tx_ref,
        //     status: "pending",
        // });

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

        // Make sure eventId and userId exist in metadata and are valid
        const eventId = data.meta?.eventId;
        const userId = data.meta?.userId;
        if (!eventId || !userId) {
            return res.status(400).json({ message: "Event or user metadata missing from transaction" });
        }

        // Find event and check registration/payment state
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Ensure ObjectId type for matching
        const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;

        // Prevent duplicate registration
        if (!event.registeredUsers.some((u) => u.equals(userObjectId))) {
            event.registeredUsers.push(userObjectId);
        }

        // Prevent duplicate payment records
        const paymentExists = event.payments.some(
            (p) => String(p.transactionId) === String(data.id)
        );
        if (!paymentExists) {
            event.payments.push({
                user: userObjectId,
                transactionId: data.id,
                amount: data.amount,
                status: data.status,
                date: data.completed_at ? new Date(data.completed_at) : new Date()
            });
        }

        // Only mark as paid if this is a paid event
        if (event.isPaid !== true) {
            event.isPaid = true;
        }

        await event.save();

        await savePaymentHistory(
            data.customer.id,
            "event",
            data.id,
            data.amount,
            data.currency,
            data.status,
            { eventId }
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