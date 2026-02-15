import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEventPayment {
    user: Types.ObjectId;
    transactionId: string;
    amount: number;
    status: string;
    date: Date;
}

export interface IEventSettings {
    maxCapacity?: number;
    isPremiumOnly: boolean;
    registrationDeadline?: Date;
    allowWaitlist: boolean;
    requireApproval: boolean;
    customFields: ICustomField[];
    notifications: INotificationSettings;
}

export interface ICustomField {
    id: string;
    name: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
    required: boolean;
    options?: string[];
}

export interface INotificationSettings {
    sendReminders: boolean;
    reminderDays: number[];
    sendUpdates: boolean;
    sendConfirmations: boolean;
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
    
    // Enhanced admin functionality
    status: 'draft' | 'published' | 'cancelled' | 'completed';
    settings: IEventSettings;
    
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

const CustomFieldSchema = new Schema<ICustomField>(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { 
            type: String, 
            enum: ['text', 'email', 'phone', 'select', 'textarea'], 
            required: true 
        },
        required: { type: Boolean, default: false },
        options: [{ type: String }]
    },
    { _id: false }
);

const NotificationSettingsSchema = new Schema<INotificationSettings>(
    {
        sendReminders: { type: Boolean, default: true },
        reminderDays: [{ type: Number }],
        sendUpdates: { type: Boolean, default: true },
        sendConfirmations: { type: Boolean, default: true }
    },
    { _id: false }
);

const EventSettingsSchema = new Schema<IEventSettings>(
    {
        maxCapacity: { type: Number },
        isPremiumOnly: { type: Boolean, default: false },
        registrationDeadline: { type: Date },
        allowWaitlist: { type: Boolean, default: false },
        requireApproval: { type: Boolean, default: false },
        customFields: [CustomFieldSchema],
        notifications: { type: NotificationSettingsSchema, default: () => ({}) }
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
        payments: [EventPaymentSchema],
        
        // Enhanced admin functionality
        status: { 
            type: String, 
            enum: ['draft', 'published', 'cancelled', 'completed'], 
            default: 'published' 
        },
        settings: { type: EventSettingsSchema, default: () => ({}) }
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>("Event", EventSchema);
