import mongoose, { Schema, Document } from "mongoose";

export interface IForumReport extends Document {
    reportType: 'thread' | 'reply' | 'user';
    reportedContent?: mongoose.Schema.Types.ObjectId;
    reportedUser?: mongoose.Schema.Types.ObjectId;
    reporter: mongoose.Schema.Types.ObjectId;
    reason: 'spam' | 'harassment' | 'inappropriate' | 'off-topic' | 'other';
    description?: string;
    status: 'pending' | 'resolved' | 'dismissed';
    resolvedBy?: mongoose.Schema.Types.ObjectId;
    resolvedAt?: Date;
    resolutionNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const forumReportSchema = new Schema<IForumReport>(
    {
        reportType: {
            type: String,
            enum: ['thread', 'reply', 'user'],
            required: true
        },
        reportedContent: {
            type: Schema.Types.ObjectId,
            refPath: 'reportType',
            validate: {
                validator: function(this: IForumReport, value: any) {
                    // reportedContent is required for thread and reply reports
                    if (this.reportType === 'thread' || this.reportType === 'reply') {
                        return value != null;
                    }
                    return true;
                },
                message: 'reportedContent is required for thread and reply reports'
            }
        },
        reportedUser: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            validate: {
                validator: function(this: IForumReport, value: any) {
                    // reportedUser is required for user reports
                    if (this.reportType === 'user') {
                        return value != null;
                    }
                    return true;
                },
                message: 'reportedUser is required for user reports'
            }
        },
        reporter: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        reason: {
            type: String,
            enum: ['spam', 'harassment', 'inappropriate', 'off-topic', 'other'],
            required: true
        },
        description: {
            type: String,
            maxlength: 1000
        },
        status: {
            type: String,
            enum: ['pending', 'resolved', 'dismissed'],
            default: 'pending'
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: {
            type: Date
        },
        resolutionNotes: {
            type: String,
            maxlength: 1000
        }
    },
    { timestamps: true }
);

// Indexes for query performance
forumReportSchema.index({ status: 1, createdAt: -1 });
forumReportSchema.index({ reportType: 1, status: 1 });
forumReportSchema.index({ reporter: 1 });
forumReportSchema.index({ resolvedBy: 1 });

// Compound index for preventing duplicate reports
forumReportSchema.index({ 
    reporter: 1, 
    reportType: 1, 
    reportedContent: 1, 
    reportedUser: 1 
}, { 
    unique: true,
    partialFilterExpression: { 
        status: 'pending' 
    }
});

// Pre-save validation to ensure proper refPath setup
forumReportSchema.pre('save', function(next) {
    if (this.reportType === 'thread') {
        this.set('reportedContent', this.reportedContent, { refPath: 'ForumThread' });
    } else if (this.reportType === 'reply') {
        this.set('reportedContent', this.reportedContent, { refPath: 'ForumReply' });
    }
    next();
});

export default mongoose.model<IForumReport>("ForumReport", forumReportSchema);