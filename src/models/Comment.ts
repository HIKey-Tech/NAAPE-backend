import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
    publication: mongoose.Schema.Types.ObjectId;
    user: mongoose.Schema.Types.ObjectId;
    text: string;
    createdAt: Date;
}

const commentSchema = new Schema<IComment>(
    {
        publication: {
            type: Schema.Types.ObjectId,
            ref: "Publication",
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

export default mongoose.model<IComment>("Comment", commentSchema);
