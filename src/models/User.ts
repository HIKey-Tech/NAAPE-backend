import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cryptoLib from "crypto";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    role: "admin" | "editor" | "member";
    isVerified: boolean;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;

    profile: {
        image?: {
            url: string,
            publicId: string,
        },         
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
    generateAuthToken(): string;
    getResetPasswordToken(): string;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "editor", "member"], default: "member" },
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    profile: {
    image: {
        url: { type: String },
        publicId: { type: String },
    },
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

// Token generator method on schema
userSchema.methods.generateAuthToken = function () {
    const payload = {
        id: this._id,
        role: this.role,
    };
    const secret = process.env.JWT_SECRET || "@NAAPEPASSWORDTOKEN@";
    const token = jwt.sign(payload, secret, { expiresIn: "30d" });
    return token;
};


userSchema.methods.getResetPasswordToken = function () {
    // Generate a random token (32 bytes for sufficient entropy)
    const resetToken = cryptoLib.randomBytes(32).toString("hex");

    this.resetPasswordToken = cryptoLib
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    return resetToken;
};


export default mongoose.model<IUser>("User", userSchema);