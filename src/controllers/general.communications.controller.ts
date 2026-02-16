import { Request, Response } from "express";
import User from "../models/User";
import CommunicationHistory from "../models/CommunicationHistory";
import { sendBulkEmail as bulkEmailService } from "../utils/bulkEmailService";

// Send bulk email to all members
export const sendGeneralBulkEmail = async (req: Request, res: Response) => {
    try {
        const { subject, content } = req.body;
        const userId = (req as any).user.id;

        // Validate required fields
        if (!subject || !content) {
            return res.status(400).json({
                success: false,
                message: "Subject and content are required"
            });
        }

        console.log("General bulk email request:", {
            subject,
            contentLength: content.length,
            sentBy: userId
        });

        // Get all active users (members)
        const users = await User.find({ 
            isActive: { $ne: false },
            email: { $exists: true, $ne: null }
        }).select('email name');

        if (!users || users.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No active members found"
            });
        }

        const recipients = users.map(user => user.email);

        console.log(`Sending email to ${recipients.length} members`);

        // Create communication history record
        const communicationHistory = new CommunicationHistory({
            type: 'email',
            subject,
            content,
            recipients,
            sentBy: userId,
            deliveryStatus: 'pending'
        });

        await communicationHistory.save();

        // Send bulk email
        const bulkResult = await bulkEmailService({
            recipients,
            subject,
            text: content,
            html: content.replace(/\n/g, '<br>'),
            communicationId: (communicationHistory._id as any).toString()
        });

        // Update communication history with results
        communicationHistory.deliveryStatus = bulkResult.failed === 0 ? 'delivered' : 
                                            (bulkResult.successful === 0 ? 'failed' : 'delivered');
        
        if (bulkResult.failed > 0) {
            communicationHistory.errorMessage = `${bulkResult.failed} emails failed to send`;
        }
        
        await communicationHistory.save();

        res.status(200).json({
            success: true,
            message: `Email sent successfully to ${bulkResult.successful} members. ${bulkResult.failed} failed.`,
            results: {
                total: bulkResult.total,
                successful: bulkResult.successful,
                failed: bulkResult.failed,
                communicationId: communicationHistory._id
            }
        });

    } catch (error: any) {
        console.error("Send general bulk email error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send bulk email",
            error: error.message
        });
    }
};

// Get general communication history
export const getGeneralCommunicationHistory = async (req: Request, res: Response) => {
    try {
        const communications = await CommunicationHistory.find({ 
            eventId: { $exists: false } // Only get general communications (not event-specific)
        })
            .populate('sentBy', 'name email')
            .sort({ sentAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            communications
        });
    } catch (error: any) {
        console.error("Get general communication history error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch communication history",
            error: error.message
        });
    }
};

// Get total member count
export const getMemberCount = async (req: Request, res: Response) => {
    try {
        const count = await User.countDocuments({ 
            isActive: { $ne: false },
            email: { $exists: true, $ne: null }
        });

        res.status(200).json({
            success: true,
            count
        });
    } catch (error: any) {
        console.error("Get member count error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch member count",
            error: error.message
        });
    }
};
