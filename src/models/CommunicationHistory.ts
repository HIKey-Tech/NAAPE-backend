import mongoose, { Schema, Document } from "mongoose";

export interface ICommunicationHistory extends Document {
    eventId?: mongoose.Types.ObjectId;
    type: 'email' | 'sms' | 'push';
    subject: string;
    content: string;
    recipients: string[];
    sentBy: mongoose.Types.ObjectId;
    sentAt: Date;
    deliveryStatus: 'sent' | 'delivered' | 'failed' | 'pending';
    templateUsed?: mongoose.Types.ObjectId;
    sendGridMessageId?: string;
    errorMessage?: string;
}

const CommunicationHistorySchema = new Schema<ICommunicationHistory>(
    {
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: false },
        type: { 
            type: String, 
            enum: ['email', 'sms', 'push'], 
            required: true 
        },
        subject: { type: String, required: true },
        content: { type: String, required: true },
        recipients: [{ type: String, required: true }],
        sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        sentAt: { type: Date, default: Date.now },
        deliveryStatus: { 
            type: String, 
            enum: ['sent', 'delivered', 'failed', 'pending'], 
            default: 'pending' 
        },
        templateUsed: { type: Schema.Types.ObjectId, ref: "EmailTemplate" },
        sendGridMessageId: { type: String },
        errorMessage: { type: String }
    },
    { timestamps: true }
);

export default mongoose.model<ICommunicationHistory>("CommunicationHistory", CommunicationHistorySchema);