import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    role: "admin" | "editor" | "member";
    isVerified: boolean;

    profile: {
        image?: {
            url: string,
            publicId: string,
        },         // Cloudinary / S3 URL
        specialization?: string;
        bio?: string;
        organization?: string;
        phone?: string;
    };

    professional: {
        licenseNumber?: string;
        licenseDocument?: string; // PDF/image URL
        yearsOfExperience?: number;
        certifications?: string[];
    };

    matchePassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "editor", "member"], default: "member" },
    isVerified: { type: Boolean, default: false },
    profile: {
        image: { type: String },
        specialization: { type: String },
        bio: { type: String },
        organization: { type: String },
        phone: { type: String }
    },
    professional: {
        licenseNumber: { type: String },
        licenseDocument: { type: String },
        yearsOfExperience: { type: Number },
        certifications: [{ type: String }]
    }
}, { timestamps: true });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.matchePassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);