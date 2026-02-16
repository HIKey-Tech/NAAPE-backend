import mongoose, { Schema, Document } from "mongoose";

export interface IThreadApproval extends Document {
    thread: mongoose.Schema.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: mongoose.Schema.Types.ObjectId;
    reviewedAt?: Date;
    reviewNotes?: string;
    createdAt: Date;
    updatedAt: Date;
    
    // Instance methods
    approve(reviewerId: mongoose.Schema.Types.ObjectId, notes?: string): void;
    reject(reviewerId: mongoose.Schema.Types.ObjectId, notes?: string): void;
}

const threadApprovalSchema = new Schema<IThreadApproval>(
    {
        thread: {
            type: Schema.Types.ObjectId,
            ref: 'ForumThread',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            validate: {
                validator: function(this: IThreadApproval, value: any) {
                    // reviewedBy is required when status is not pending
                    if (this.status !== 'pending') {
                        return value != null;
                    }
                    return true;
                },
                message: 'reviewedBy is required when status is approved or rejected'
            }
        },
        reviewedAt: {
            type: Date,
            validate: {
                validator: function(this: IThreadApproval, value: any) {
                    // reviewedAt is required when status is not pending
                    if (this.status !== 'pending') {
                        return value != null;
                    }
                    return true;
                },
                message: 'reviewedAt is required when status is approved or rejected'
            }
        },
        reviewNotes: {
            type: String,
            maxlength: 1000
        }
    },
    { timestamps: true }
);

// Indexes for query performance
threadApprovalSchema.index({ status: 1, createdAt: -1 });
threadApprovalSchema.index({ reviewedBy: 1 });
threadApprovalSchema.index({ thread: 1 }, { unique: true });

// Pre-save middleware to set reviewedAt when status changes
threadApprovalSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
        this.reviewedAt = new Date();
    }
    next();
});

// Instance method to approve thread
threadApprovalSchema.methods.approve = function(
    reviewerId: mongoose.Schema.Types.ObjectId, 
    notes?: string
): void {
    this.status = 'approved';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    if (notes) {
        this.reviewNotes = notes;
    }
};

// Instance method to reject thread
threadApprovalSchema.methods.reject = function(
    reviewerId: mongoose.Schema.Types.ObjectId, 
    notes?: string
): void {
    this.status = 'rejected';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    if (notes) {
        this.reviewNotes = notes;
    }
};

// Static method to find pending approvals
threadApprovalSchema.statics.findPending = function() {
    return this.find({ status: 'pending' })
        .populate('thread', 'title content author category createdAt')
        .populate('thread.author', 'name email')
        .populate('thread.category', 'name')
        .sort({ createdAt: -1 });
};

// Static method to find approvals by reviewer
threadApprovalSchema.statics.findByReviewer = function(reviewerId: mongoose.Schema.Types.ObjectId) {
    return this.find({ reviewedBy: reviewerId })
        .populate('thread', 'title content author category')
        .sort({ reviewedAt: -1 });
};

// Static method to get approval statistics
threadApprovalSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    
    const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    };
    
    stats.forEach(stat => {
        result[stat._id as keyof typeof result] = stat.count;
        result.total += stat.count;
    });
    
    return result;
};

export default mongoose.model<IThreadApproval>("ThreadApproval", threadApprovalSchema);