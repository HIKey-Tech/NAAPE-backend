import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cryptoLib from "crypto";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
    role: "admin" | "editor" | "member";
    isVerified: boolean;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    googleId?: string;
    authProvider?: "local" | "google";
    profileSlug?: string;

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
    generateProfileSlug(): string;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role: { type: String, enum: ["admin", "editor", "member"], default: "member" },
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    googleId: { type: String },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    profileSlug: { type: String, unique: true, sparse: true },
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

// Combined pre-save hook for password hashing and profile slug generation
userSchema.pre("save", async function (next) {
    // Hash password if modified
    if (this.isModified("password") && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    
    // Generate profile slug if new user or name changed
    if ((this.isNew || this.isModified("name")) && !this.profileSlug) {
        this.profileSlug = await this.generateProfileSlug();
    }
    
    next();
});

userSchema.methods.matchePassword = async function (enteredPassword: string) {
    if (!this.password) {
        return false;
    }
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

// Generate a unique profile slug from name
userSchema.methods.generateProfileSlug = async function () {
    const baseSlug = this.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen

    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and append number if needed
    while (await mongoose.model<IUser>("User").findOne({ profileSlug: slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};

export default mongoose.model<IUser>("User", userSchema);