import mongoose, { Document, Schema } from "mongoose";

export interface IGallery extends Document {
    url: string;
    caption?: string;
    category: string;
    uploadedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const GallerySchema: Schema = new Schema(
    {
        url: { type: String, required: true },
        caption: { type: String },
        category: { type: String, required: true, trim: true },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<IGallery>("Gallery", GallerySchema);
