import mongoose, { Schema, Document } from "mongoose";

export interface IMembershipForm extends Document {
    name: string;
    email,
    tel: string;
    address: string;
    designation?: string;
    dateOfEmployment?: Date;
    section?: string;
    qualification?: string;
    licenseNo?: string;
    employer?: string;
    rank?: string;
    signature: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

const MembershipFormSchema = new Schema<IMembershipForm>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        tel: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        designation: { type: String, default: "", trim: true },
        dateOfEmployment: { type: Date },
        section: { type: String, default: "", trim: true },
        qualification: { type: String, default: "", trim: true },
        licenseNo: { type: String, default: "", trim: true },
        employer: { type: String, default: "", trim: true },
        rank: { type: String, default: "", trim: true },
        signature: { type: String, required: true, trim: true },
        date: { type: Date, required: true }
    },
    { timestamps: true }
);

export default mongoose.model<IMembershipForm>("MembershipForm", MembershipFormSchema);
