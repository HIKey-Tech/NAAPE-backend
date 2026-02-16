import mongoose, { Schema, Document } from "mongoose";

export interface IUserForumBan extends Document {
    user: mongoose.Schema.Types.ObjectId;
    banType: 'permanent' | 'temporary' | 'mute';
    duration?: number; // in days for temporary bans
    reason: string;
    bannedBy: mongoose.Schema.Types.ObjectId;
    isActive: boolean;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    
    // Instance methods
    isExpired(): boolean;
    activate(): void;
    deactivate(): void;
}

const userForumBanSchema = new Schema<IUserForumBan>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        banType: {
            type: String,
            enum: ['permanent', 'temporary', 'mute'],
            required: true
        },
        duration: {
            type: Number,
            validate: {
                validator: function(this: IUserForumBan, value: any) {
                    // Duration is required for temporary bans
                    if (this.banType === 'temporary') {
                        return value != null && value > 0;
                    }
                    return true;
                },
                message: 'Duration is required for temporary bans and must be greater than 0'
            }
        },
        reason: {
            type: String,
            required: true,
            maxlength: 500
        },
        bannedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        expiresAt: {
            type: Date,
            validate: {
                validator: function(this: IUserForumBan, value: any) {
                    // expiresAt is required for temporary bans
                    if (this.banType === 'temporary') {
                        return value != null;
                    }
                    return true;
                },
                message: 'expiresAt is required for temporary bans'
            }
        }
    },
    { timestamps: true }
);

// Indexes for query performance
userForumBanSchema.index({ user: 1, isActive: 1 });
userForumBanSchema.index({ bannedBy: 1 });
userForumBanSchema.index({ expiresAt: 1, isActive: 1 });
userForumBanSchema.index({ banType: 1, isActive: 1 });

// Compound index to ensure only one active ban per user
userForumBanSchema.index({ 
    user: 1, 
    isActive: 1 
}, { 
    unique: true,
    partialFilterExpression: { 
        isActive: true 
    }
});

// Pre-save middleware to set expiration date for temporary bans
userForumBanSchema.pre('save', function(next) {
    if (this.banType === 'temporary' && this.duration && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + (this.duration * 24 * 60 * 60 * 1000));
    }
    next();
});

// Instance method to check if ban is expired
userForumBanSchema.methods.isExpired = function(): boolean {
    if (this.banType === 'permanent') {
        return false;
    }
    if (this.banType === 'temporary' && this.expiresAt) {
        return new Date() > this.expiresAt;
    }
    return false;
};

// Instance method to activate ban
userForumBanSchema.methods.activate = function(): void {
    this.isActive = true;
};

// Instance method to deactivate ban
userForumBanSchema.methods.deactivate = function(): void {
    this.isActive = false;
};

// Static method to find active bans for a user
userForumBanSchema.statics.findActiveBanForUser = function(userId: mongoose.Schema.Types.ObjectId) {
    return this.findOne({ 
        user: userId, 
        isActive: true,
        $or: [
            { banType: 'permanent' },
            { banType: 'mute' },
            { 
                banType: 'temporary',
                expiresAt: { $gt: new Date() }
            }
        ]
    });
};

// Static method to expire old temporary bans
userForumBanSchema.statics.expireOldBans = async function() {
    const result = await this.updateMany(
        {
            banType: 'temporary',
            isActive: true,
            expiresAt: { $lt: new Date() }
        },
        {
            $set: { isActive: false }
        }
    );
    return result;
};

export default mongoose.model<IUserForumBan>("UserForumBan", userForumBanSchema);