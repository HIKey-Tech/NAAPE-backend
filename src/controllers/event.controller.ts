import Event from "../models/Event";
import Notification from "../models/Notification";
import Flutterwave from "flutterwave-node-v3";


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

const flw = new Flutterwave(
    process.env.FLW_PUBLIC_KEY,
    process.env.FLW_SECRET_KEY
);

export const registerEventPayment = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // If free → register instantly
        if (!event.isPaid || event.price === 0) {
            if (!event.registeredUsers.includes(userId)) {
                event.registeredUsers.push(userId);
                await event.save();
            }
            return res.status(200).json({ message: "Registered (Free Event)" });
        }

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

        const response = await flw.Payment.initialize(payload);

        return res.status(200).json({
            checkoutUrl: response.data.link
        });

    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};


export const registerForEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const event = await Event.findById(eventId);

        if (!event) return res.status(404).json({ message: "Event not found" });

        // Prevent duplicate registration
        if (event.registeredUsers.includes(userId)) {
            return res.status(400).json({ message: "You already registered" });
        }

        event.registeredUsers.push(userId);
        await event.save();

        res.status(200).json({ message: "Registration successful", event });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

