import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
    title: string;
    date: string;
    location: string;
    imageUrl: string;
    createdBy: mongoose.Types.ObjectId;
}

const EventSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        date: { type: String, required: true },
        location: { type: String, required: true },
        imageUrl: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>("Event", EventSchema);
