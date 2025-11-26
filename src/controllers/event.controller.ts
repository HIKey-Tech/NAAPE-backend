import { Request, Response } from "express";
import Event from "../models/Event";

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { title, date, location, imageUrl } = req.body;
        const adminId = (req as any).user?.id;

        const event = await Event.create({
            title,
            date,
            location,
            imageUrl,
            createdBy: adminId,
        });

        res.status(201).json({
            message: "Event created successfully",
            data: event,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


//fetch all events
export const getAllEvents = async (req: Request, res: Response) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.status(200).json(events);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
