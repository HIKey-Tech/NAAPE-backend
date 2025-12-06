import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPaymentHistory extends Document {
    user: Types.ObjectId;
    type: "event" | "subscription" | "tokenized-payment" | "transfer" | "other";
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    metadata: any; // event id, plan id, recipient name, etc
    createdAt: Date;
}

const PaymentHistorySchema = new Schema<IPaymentHistory>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, required: true },
        transactionId: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "NGN" },
        status: { type: String, required: true },
        metadata: { type: Object, default: {} }
    },
    { timestamps: true }
);

export default mongoose.model<IPaymentHistory>("PaymentHistory", PaymentHistorySchema);
