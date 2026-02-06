import mongoose, { Schema, Document } from "mongoose";

export interface IForumCategory extends Document {
    name: string;
    description: string;
    slug: string;
    icon?: string;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const forumCategorySchema = new Schema<IForumCategory>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        description: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        icon: { type: String },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model<IForumCategory>("ForumCategory", forumCategorySchema);
