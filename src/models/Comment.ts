import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
    publication?: mongoose.Schema.Types.ObjectId;
    news?: mongoose.Schema.Types.ObjectId;
    contentType: "publication" | "news";
    user: mongoose.Schema.Types.ObjectId;
    text: string;
    parentComment?: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
}

const commentSchema = new Schema<IComment>(
    {
        publication: {
            type: Schema.Types.ObjectId,
            ref: "Publication",
        },
        news: {
            type: Schema.Types.ObjectId,
            ref: "News",
        },
        contentType: {
            type: String,
            enum: ["publication", "news"],
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: { type: String, required: true, trim: true },
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
    },
    { timestamps: true }
);

// Ensure either publication or news is set based on contentType
commentSchema.pre("save", function (next) {
    if (this.contentType === "publication" && !this.publication) {
        return next(new Error("Publication ID is required for publication comments"));
    }
    if (this.contentType === "news" && !this.news) {
        return next(new Error("News ID is required for news comments"));
    }
    next();
});

export default mongoose.model<IComment>("Comment", commentSchema);
