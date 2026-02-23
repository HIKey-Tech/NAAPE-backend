import { Request, Response } from "express";
import Gallery from "../models/Gallery";

export const uploadGalleryImage = async (req: Request, res: Response) => {
    try {
        const { url, category, caption } = req.body;
        const uploadedBy = (req as any).user?.id;

        let filesToProcess: string[] = [];

        // Handle multer files array
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            filesToProcess = req.files.map((file: any) => file.path);
        } else if (url) {
            // Also accept a single URL string for backward compatibility
            filesToProcess = [url];
        }

        if (filesToProcess.length === 0 || !category) {
            return res.status(400).json({ message: "Images and Category are required" });
        }

        // Insert all images
        const galleryItems = await Promise.all(
            filesToProcess.map((fileUrl) =>
                Gallery.create({
                    url: fileUrl,
                    category,
                    caption,
                    uploadedBy
                })
            )
        );

        res.status(201).json({
            message: `${galleryItems.length} image(s) uploaded successfully`,
            data: galleryItems
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getGalleryImages = async (req: Request, res: Response) => {
    try {
        const images = await Gallery.find().sort({ createdAt: -1 });

        // Group by category for frontend convenience
        const categories = [...new Set(images.map((img) => img.category))];
        const data = categories.map((cat) => ({
            title: cat,
            images: images.filter((img) => img.category === cat).map((img) => ({
                id: img._id,
                src: img.url,
                alt: img.caption || cat,
                caption: img.caption,
                date: img.createdAt
            }))
        }));

        res.status(200).json({
            message: "Gallery fetched successfully",
            data,
            rawImages: images
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteGalleryImage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deleted = await Gallery.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Image not found" });
        }

        res.status(200).json({ message: "Image deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
