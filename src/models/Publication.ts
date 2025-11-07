import mongoose, { Schema, Document } from "mongoose";

export interface IPublication extends Document {
    title: string;
    content: string;
    category: string;
    author: mongoose.Schema.Types.ObjectId;
    status: "pending" | "approved" | "rejected";
    createAt: Date;
    updatedAt: Date;
}

const publicationSchema = new Schema<IPublication>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: ["Engineering", "Pilot", "News", "General"],
            default: "General"
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
    },
    { timestamps: true }
);

export default mongoose.model<IPublication>("Publication", publicationSchema);