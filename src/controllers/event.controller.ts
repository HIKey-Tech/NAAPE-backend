import Event from "../models/Event";
import Notification from "../models/Notification";

export const createEvent = async (req, res) => {
    try {
        const { title, date, location, imageUrl, description } = req.body;
        const adminId = req.user.id;

        const event = await Event.create({
            title,
            date,
            location,
            imageUrl,
            description,
            createdBy: adminId,
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

