import { Request, Response } from "express";
import Publication from "../models/Publication"
import { request } from "http";

//Create new publication (Member)
export const createPublication = async (req: Request, res: Response) => {
    try {
        const { title, content, category } = req.body;
        const authorId = (req as any).user?.id;

        const publication = await Publication.create({
            title,
            content,
            category,
            author: authorId,
        });
        res.status(201).json({
            message: "Publication submitted successfully and awaiting approval.",
            data: publication,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
};

//Fetch all approved publications (Public)
export const getApprovedPublications = async (req: Request, res: Response) => {
    try {
        const publications = await Publication.find({ status: "approved" }).populate(
            "author", "name email"
        );

        res.status(200).json(publications);
    } catch (error: any) {
        res.status(500).json({ message: error.message });

    }
};

//Admin or Editor approves publication
export const approvedPublication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const publication = await Publication.findByIdAndUpdate(
            id,
            { status: "approved" },
            { new: true }
        );

        if (!publication) return res.status(404).json({ message: "Not found" });
        res.status(200).json({ message: "Publication approved", publication })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
};

//Admin rejects publication
export const rejectPublication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const publication = await Publication.findByIdAndUpdate(
            id,
            { status: "rejected" },
            { new: true }
        );

        if (!publication) return res.status(404).json({ message: "Not found" });
        res.status(200).json({ message: "Publication rejected", publication })
    } catch (error: any) {
        res.status(500).json({ message: error.message })

    }
}