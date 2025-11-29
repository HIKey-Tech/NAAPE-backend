import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
    title: string;
    date: string;
    location: string;
    imageUrl: string;
    description: string;
    createdBy: mongoose.Types.ObjectId;
    registeredUsers: mongoose.Types.ObjectId[];
}

const EventSchema = new Schema(
    {
        title: { type: String, required: true },
        date: { type: String, required: true },
        location: { type: String, required: true },
        imageUrl: { type: String },
        description: { type: String },

        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },

        registeredUsers: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>("Event", EventSchema);
