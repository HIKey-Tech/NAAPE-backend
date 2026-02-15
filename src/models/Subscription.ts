import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    flutterwaveSubscriptionId?: string; // ✅ optional now
    flutterwaveCustomerId?: string;
    email: string;
    tier: "free" | "premium";
    status: "pending" | "active" | "cancelled";
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;

    // Embedded Plan snapshot at time of subscription
    planName: "free" | "premium";
    flutterwavePlanId?: string;
    price?: number;
    currency: string;
    interval: "monthly" | "yearly";
    features: string[];
    isActive: boolean;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        planId: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
        },
        flutterwaveSubscriptionId: {
            type: String, // ✅ optional now
            unique: true,
            sparse: true, // allows multiple nulls
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
            enum: ["free", "premium"],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "active", "cancelled"],
            default: "pending",
        },
        startDate: { type: Date },
        endDate: { type: Date },
        planName: {
            type: String,
            enum: ["free", "premium"],
        },
        flutterwavePlanId: { type: String },
        price: { type: Number },
        currency: { type: String, default: "NGN" },
        interval: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
        features: { type: [String] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>(
    "Subscription",
    SubscriptionSchema
);
