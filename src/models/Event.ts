import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEventPayment {
    user: Types.ObjectId;
    transactionId: string;
    amount: number;
    status: string;
    date: Date;
}

export interface IEvent extends Document {
    title: string;
    date: Date;
    location: string;
    imageUrl?: string;
    description?: string;
    price: number;
    currency: string;
    isPaid: boolean;
    createdBy: Types.ObjectId;
    registeredUsers: Types.ObjectId[];
    payments: IEventPayment[];
    createdAt: Date;
    updatedAt: Date;
}

const EventPaymentSchema = new Schema<IEventPayment>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        transactionId: { type: String, required: true },
        amount: { type: Number, required: true },
        status: { type: String, required: true },
        date: { type: Date, default: Date.now }
    },
    { _id: false }
);

const EventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        location: { type: String, required: true, trim: true },
        imageUrl: { type: String, default: "" },
        description: { type: String, default: "" },
        price: { type: Number, default: 0 },
        currency: { type: String, default: "NGN" },
        isPaid: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        registeredUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
        payments: [EventPaymentSchema]
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>("Event", EventSchema);
