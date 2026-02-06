import mongoose, { Schema, Document } from "mongoose";

export interface IThreadView extends Document {
    thread: mongoose.Schema.Types.ObjectId;
    user?: mongoose.Schema.Types.ObjectId;
    ipAddress?: string;
    viewedAt: Date;
}

const threadViewSchema = new Schema<IThreadView>(
    {
        thread: {
            type: Schema.Types.ObjectId,
            ref: "ForumThread",
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        ipAddress: {
            type: String,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

// Compound index to ensure one view per user per thread
threadViewSchema.index({ thread: 1, user: 1 }, { unique: true, sparse: true });
threadViewSchema.index({ thread: 1, ipAddress: 1 }, { unique: true, sparse: true });

export default mongoose.model<IThreadView>("ThreadView", threadViewSchema);
