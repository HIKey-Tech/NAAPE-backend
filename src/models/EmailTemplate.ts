import mongoose, { Schema, Document } from "mongoose";

export interface IEmailTemplate extends Document {
    name: string;
    subject: string;
    content: string;
    type: 'reminder' | 'update' | 'confirmation' | 'cancellation';
    variables: string[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
    {
        name: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        type: { 
            type: String, 
            enum: ['reminder', 'update', 'confirmation', 'cancellation'], 
            required: true 
        },
        variables: [{ type: String }],
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
    },
    { timestamps: true }
);

export default mongoose.model<IEmailTemplate>("EmailTemplate", EmailTemplateSchema);