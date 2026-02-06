import mongoose, { Schema, Document } from "mongoose";

export interface IForumThread extends Document {
    title: string;
    content: string;
    category: mongoose.Schema.Types.ObjectId;
    author: mongoose.Schema.Types.ObjectId;
    isPinned: boolean;
    isLocked: boolean;
    views: number;
    lastActivity: Date;
    createdAt: Date;
    updatedAt: Date;
}

const forumThreadSchema = new Schema<IForumThread>(
    {
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        category: {
            type: Schema.Types.ObjectId,
            ref: "ForumCategory",
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isPinned: { type: Boolean, default: false },
        isLocked: { type: Boolean, default: false },
        views: { type: Number, default: 0 },
        lastActivity: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Index for better query performance
forumThreadSchema.index({ category: 1, isPinned: -1, lastActivity: -1 });
forumThreadSchema.index({ author: 1 });

export default mongoose.model<IForumThread>("ForumThread", forumThreadSchema);
