import mongoose, { Schema, Document } from "mongoose";

export interface IPlan extends Document {
    name: "basic" | "premium";
    flutterwavePlanId: string;
    price: number;
    currency: string;
    interval: "monthly" | "yearly";
    features: string[];
    isActive: boolean;
}

const PlanSchema = new Schema<IPlan>(
    {
        name: {
            type: String,
            enum: ["basic", "premium"],
            required: true,
            unique: true,
        },

        flutterwavePlanId: {
            type: String,
            required: true,
        },

        price: Number,
        currency: { type: String, default: "NGN" },

        interval: {
            type: String,
            enum: ["monthly", "yearly"],
            default: "monthly",
        },

        features: [String],

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Plan = mongoose.model<IPlan>("Plan", PlanSchema);
