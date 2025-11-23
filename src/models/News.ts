import mongoose, { Schema, Document } from "mongoose";

export interface INews extends Document {
    title: string;
    content: string;
    category: "Engineering" | "Pilot" | "General" | "Announcement";
    image?: string;
    author: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const newsSchema = new Schema<INews>(
    {
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        category: {
            type: String,
            enum: ["Engineering", "Pilot", "General", "Announcement"],
            default: "General"
        },
        image: { type: String },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<INews>("News", newsSchema);
