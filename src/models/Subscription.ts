import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    flutterwaveSubscriptionId: string;
    flutterwaveCustomerId?: string;
    email: string;
    tier: "basic" | "premium"
    status: "pending" | "active" | "cancelled";
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        planId: { type: Schema.Types.ObjectId, required: true, ref: "Plan" },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        flutterwaveSubscriptionId: {
            type: String,
            required: true,
            unique: true,
        },

        flutterwaveCustomerId: {
            type: String,
        },

        email: {
            type: String,
            required: true,
            index: true,
        },

        tier: {
            type: String,
            enum: ["basic", "premium"],
            required: true,
        },

        status: {
            type: String,
            enum: ["pending", "active", "cancelled"],
            default: "pending",
        },

        startDate: {
            type: Date,
        },

        endDate: {
            type: Date,
        },
    },
    { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>(
    "Subscription",
    SubscriptionSchema
);
