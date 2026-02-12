import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";

export interface IPublication extends Document {
    title: string;
    content: string;
    category: string;
    image?: string;
    author: mongoose.Schema.Types.ObjectId | IUser;
    status: "draft" | "pending" | "approved" | "rejected";
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
        image: { type: String },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["draft", "pending", "approved", "rejected"],
            default: "draft"
        },
    },
    { timestamps: true }
);

export default mongoose.model<IPublication>("Publication", publicationSchema);