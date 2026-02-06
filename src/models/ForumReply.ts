import mongoose, { Schema, Document } from "mongoose";

export interface IForumReply extends Document {
    thread: mongoose.Schema.Types.ObjectId;
    author: mongoose.Schema.Types.ObjectId;
    content: string;
    parentReply?: mongoose.Schema.Types.ObjectId;
    isEdited: boolean;
    editedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const forumReplySchema = new Schema<IForumReply>(
    {
        thread: {
            type: Schema.Types.ObjectId,
            ref: "ForumThread",
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: { type: String, required: true },
        parentReply: {
            type: Schema.Types.ObjectId,
            ref: "ForumReply",
        },
        isEdited: { type: Boolean, default: false },
        editedAt: { type: Date },
    },
    { timestamps: true }
);

// Index for better query performance
forumReplySchema.index({ thread: 1, createdAt: 1 });
forumReplySchema.index({ author: 1 });

export default mongoose.model<IForumReply>("ForumReply", forumReplySchema);
