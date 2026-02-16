import mongoose, { Schema, Document } from "mongoose";

export interface IForumThread extends Document {
    title: string;
    content: string;
    category: mongoose.Schema.Types.ObjectId;
    author: mongoose.Schema.Types.ObjectId;
    isPinned: boolean;
    isLocked: boolean;
    views: number;
    lastActivity: Date;
    requiresApproval: boolean;
    isApproved: boolean;
    moderationNotes?: string;
    moderatedBy?: mongoose.Schema.Types.ObjectId;
    moderatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const forumThreadSchema = new Schema<IForumThread>(
    {
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        category: {
            type: Schema.Types.ObjectId,
            ref: "ForumCategory",
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isPinned: { type: Boolean, default: false },
        isLocked: { type: Boolean, default: false },
        views: { type: Number, default: 0 },
        lastActivity: { type: Date, default: Date.now },
        requiresApproval: { type: Boolean, default: false },
        isApproved: { type: Boolean, default: true },
        moderationNotes: { 
            type: String, 
            maxlength: 1000 
        },
        moderatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        moderatedAt: { type: Date }
    },
    { timestamps: true }
);

// Index for better query performance
forumThreadSchema.index({ category: 1, isPinned: -1, lastActivity: -1 });
forumThreadSchema.index({ author: 1 });
forumThreadSchema.index({ requiresApproval: 1, isApproved: 1 });
forumThreadSchema.index({ moderatedBy: 1, moderatedAt: -1 });

// Pre-save middleware to set moderatedAt when moderation fields change
forumThreadSchema.pre('save', function(next) {
    if (this.isModified('moderationNotes') || this.isModified('moderatedBy')) {
        this.moderatedAt = new Date();
    }
    next();
});

// Static method to find threads requiring approval
forumThreadSchema.statics.findRequiringApproval = function() {
    return this.find({ 
        requiresApproval: true, 
        isApproved: false 
    })
    .populate('author', 'name email')
    .populate('category', 'name')
    .sort({ createdAt: -1 });
};

// Static method to find moderated threads
forumThreadSchema.statics.findModerated = function() {
    return this.find({ 
        moderatedBy: { $exists: true } 
    })
    .populate('moderatedBy', 'name email')
    .populate('author', 'name email')
    .populate('category', 'name')
    .sort({ moderatedAt: -1 });
};

export default mongoose.model<IForumThread>("ForumThread", forumThreadSchema);
