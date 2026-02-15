import { Request, Response } from "express";
import EmailTemplate from "../models/EmailTemplate";
import CommunicationHistory from "../models/CommunicationHistory";
import Event from "../models/Event";
import User from "../models/User";
import sendEmail from "../utils/sendEmail";
import { sendBulkEmail as bulkEmailService } from "../utils/bulkEmailService";

// Get all email templates
export const getEmailTemplates = async (req: Request, res: Response) => {
    try {
        const templates = await EmailTemplate.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            templates
        });
    } catch (error: any) {
        console.error("Get email templates error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch email templates",
            error: error.message
        });
    }
};

// Create new email template
export const createEmailTemplate = async (req: Request, res: Response) => {
    try {
        const { name, subject, content, type, variables } = req.body;
        const userId = (req as any).user.id;

        const template = new EmailTemplate({
            name,
            subject,
            content,
            type,
            variables: variables || [],
            createdBy: userId
        });

        await template.save();
        await template.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: "Email template created successfully",
            template
        });
    } catch (error: any) {
        console.error("Create email template error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create email template",
            error: error.message
        });
    }
};

// Update email template
export const updateEmailTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, subject, content, type, variables } = req.body;

        const template = await EmailTemplate.findByIdAndUpdate(
            id,
            { name, subject, content, type, variables },
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        if (!template) {
            return res.status(404).json({
                success: false,
                message: "Email template not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Email template updated successfully",
            template
        });
    } catch (error: any) {
        console.error("Update email template error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update email template",
            error: error.message
        });
    }
};

// Delete email template
export const deleteEmailTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const template = await EmailTemplate.findByIdAndDelete(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: "Email template not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Email template deleted successfully"
        });
    } catch (error: any) {
        console.error("Delete email template error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete email template",
            error: error.message
        });
    }
};

// Get communication history for an event
export const getCommunicationHistory = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const communications = await CommunicationHistory.find({ eventId })
            .populate('sentBy', 'name email')
            .populate('templateUsed', 'name type')
            .sort({ sentAt: -1 });

        res.status(200).json({
            success: true,
            communications
        });
    } catch (error: any) {
        console.error("Get communication history error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch communication history",
            error: error.message
        });
    }
};

// Send bulk email
export const sendBulkEmail = async (req: Request, res: Response) => {
    try {
        const { eventId, recipients, subject, content, templateId, sendToAll, filters } = req.body;
        const userId = (req as any).user.id;

        // Validate required fields
        if (!eventId || !subject || !content) {
            return res.status(400).json({
                success: false,
                message: "Event ID, subject, and content are required"
            });
        }

        // Get event details for variable substitution
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        let finalRecipients = recipients;

        // If sendToAll is true, get all attendees based on filters
        if (sendToAll) {
            const attendeeQuery: any = { _id: { $in: event.registeredUsers } };
            
            // Apply filters if provided
            if (filters?.paymentStatus?.length) {
                // This would need to be implemented based on how payment status is stored
                // For now, we'll get all registered users
            }

            const attendees = await User.find(attendeeQuery).select('email name');
            finalRecipients = attendees.map(user => user.email);
        }

        if (!finalRecipients || finalRecipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No recipients specified"
            });
        }

        // Create communication history record
        const communicationHistory = new CommunicationHistory({
            eventId,
            type: 'email',
            subject,
            content,
            recipients: finalRecipients,
            sentBy: userId,
            templateUsed: templateId || undefined,
            deliveryStatus: 'pending'
        });

        await communicationHistory.save();

        // Prepare email content with variable substitution
        const emailsToSend = await Promise.all(
            finalRecipients.map(async (email: string) => {
                // Get user data for variable substitution
                const user = await User.findOne({ email }).select('name email');
                
                // Substitute variables in content
                let finalContent = content;
                let finalSubject = subject;

                // Event variables
                finalContent = finalContent.replace(/\{\{eventTitle\}\}/g, event.title);
                finalContent = finalContent.replace(/\{\{eventDate\}\}/g, new Date(event.date).toLocaleDateString());
                finalContent = finalContent.replace(/\{\{eventLocation\}\}/g, event.location);
                
                finalSubject = finalSubject.replace(/\{\{eventTitle\}\}/g, event.title);
                finalSubject = finalSubject.replace(/\{\{eventDate\}\}/g, new Date(event.date).toLocaleDateString());

                // User variables
                if (user) {
                    finalContent = finalContent.replace(/\{\{userName\}\}/g, user.name);
                    finalContent = finalContent.replace(/\{\{userEmail\}\}/g, user.email);
                    
                    finalSubject = finalSubject.replace(/\{\{userName\}\}/g, user.name);
                }

                return {
                    email,
                    subject: finalSubject,
                    content: finalContent
                };
            })
        );

        // Use the enhanced bulk email service
        const bulkResult = await bulkEmailService({
            recipients: finalRecipients,
            subject: emailsToSend[0].subject, // All should have the same subject after substitution
            text: emailsToSend[0].content, // Use first content as template (they should be similar)
            html: emailsToSend[0].content.replace(/\n/g, '<br>'),
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
            message: `Bulk email sent successfully. ${bulkResult.successful} sent, ${bulkResult.failed} failed.`,
            results: {
                total: bulkResult.total,
                successful: bulkResult.successful,
                failed: bulkResult.failed,
                communicationId: communicationHistory._id
            }
        });

    } catch (error: any) {
        console.error("Send bulk email error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send bulk email",
            error: error.message
        });
    }
};

// Get event attendees for communications
export const getEventAttendeesForCommunications = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId).populate({
            path: 'registeredUsers',
            select: 'name email profile createdAt',
            populate: {
                path: 'profile'
            }
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        // Transform attendees data
        const attendees = event.registeredUsers.map((user: any) => {
            // Find payment status for this user
            const payment = event.payments.find(p => p.user.toString() === user._id.toString());
            
            return {
                userId: user._id,
                name: user.name,
                email: user.email,
                phone: user.profile?.phone,
                registrationDate: user.createdAt,
                paymentStatus: payment ? payment.status : 'pending',
                attendanceStatus: 'registered', // Default status
                profilePicture: user.profile?.image?.url
            };
        });

        res.status(200).json({
            success: true,
            attendees
        });
    } catch (error: any) {
        console.error("Get event attendees for communications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch event attendees",
            error: error.message
        });
    }
};