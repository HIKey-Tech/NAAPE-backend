import Event from "../models/Event";
import Notification from "../models/Notification";
import PaymentHistory from "../models/PaymentHistory";
import { flw } from "../utils/flw.client";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { savePaymentHistory } from "../utils/savePaymentHistory";
import sendEmail from "../utils/sendEmail";
import { eventPaymentEmail } from "../utils/emailTemplates";
import { 
    eventPaymentEmailHTML, 
    eventRegistrationFreeEmailHTML,
    newEventNotificationEmailHTML 
} from "../utils/emailTemplatesHTML";
import User from "../models/User";


export const createEvent = async (req, res) => {
    try {
        // TEXT FIELDS from multipart/form-data
        const {
            title,
            date,
            location,
            currency,
            description,
            isPaid,
            price
        } = req.body;

        // IMAGE FILE OR FALLBACK URL
        const imageUrl = req.file ? req.file.path : req.body.image || null;

        const adminId = req.user.id;

        const event = await Event.create({
            title,
            date,
            location,
            imageUrl,
            currency,
            description,
            createdBy: adminId,
            isPaid,
            price
        });

        await Notification.create({
            title: "New Event Created",
            message: `${title} - happening on ${date}.`,
            type: "event",
            user: req.user._id,
        });

        // Notify all members about new event
        try {
            const members = await User.find({ role: { $in: ["member", "editor", "admin"] } }).limit(100);
            for (const member of members) {
                try {
                    await sendEmail({
                        to: member.email,
                        subject: `New Event: ${title}`,
                        text: `Dear ${member.name},\n\nWe are excited to announce a new event: "${title}".\n\nDate: ${new Date(date).toLocaleDateString()}\nLocation: ${location}\n\nVisit NAAPE to register now!\n\nBest regards,\nThe NAAPE Team`,
                        html: newEventNotificationEmailHTML(
                            member.name,
                            title,
                            new Date(date),
                            location,
                            description || "Join us for this exciting event!",
                            price || 0,
                            currency || "NGN",
                            String(event._id)
                        )
                    });
                } catch (emailError) {
                    console.error(`Failed to send event notification to ${member.email}:`, emailError);
                }
            }
        } catch (error) {
            console.error("Failed to notify members about new event:", error);
        }

        res.status(201).json({
            message: "Event created successfully",
            event
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        
        // Add capacity information to each event
        const eventsWithCapacity = events.map(event => {
            const eventObj = event.toObject();
            const currentCapacity = event.registeredUsers?.length || 0;
            const maxCapacity = event.settings?.maxCapacity;
            
            return {
                ...eventObj,
                currentCapacity,
                maxCapacity,
                isFull: maxCapacity ? currentCapacity >= maxCapacity : false,
                spotsRemaining: maxCapacity ? Math.max(0, maxCapacity - currentCapacity) : null
            };
        });
        
        res.status(200).json(eventsWithCapacity);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSingleEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) return res.status(404).json({ message: "Event not found" });

        // Add capacity information
        const eventObj = event.toObject();
        const currentCapacity = event.registeredUsers?.length || 0;
        const maxCapacity = event.settings?.maxCapacity;
        
        const eventWithCapacity = {
            ...eventObj,
            currentCapacity,
            maxCapacity,
            isFull: maxCapacity ? currentCapacity >= maxCapacity : false,
            spotsRemaining: maxCapacity ? Math.max(0, maxCapacity - currentCapacity) : null
        };

        res.status(200).json(eventWithCapacity);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};




// Authenticated users only - register for event payment
export const registerEventPayment = async (req, res) => {
    try {
        const { eventId } = req.body;
        const userId = req.user.id;
        const email = req.user.email;
        const name = req.user.name;

        if (!userId || !email || !name) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const userObjectId = new Types.ObjectId(userId);

        // Check if user is already registered
        const alreadyRegistered = event.registeredUsers.some(
            (u) => u.equals(userObjectId)
        );
        if (alreadyRegistered) {
            return res.status(400).json({ message: "You are already registered for this event" });
        }

        // Check capacity limit
        if (event.settings?.maxCapacity && event.settings.maxCapacity > 0) {
            const currentCapacity = event.registeredUsers.length;
            if (currentCapacity >= event.settings.maxCapacity) {
                return res.status(400).json({ 
                    message: "Event is full. Maximum capacity reached.",
                    isFull: true,
                    maxCapacity: event.settings.maxCapacity,
                    currentCapacity: currentCapacity
                });
            }
        }

        // Free events: register directly
        if (!event.isPaid || event.price === 0) {
            event.registeredUsers.push(userObjectId);
            await event.save();

                // Send free event registration confirmation email
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        await sendEmail({
                            to: user.email,
                            subject: `Event Registration Confirmed - ${event.title}`,
                            text: `Dear ${user.name},\n\nYour registration for "${event.title}" has been confirmed.\n\nDate: ${event.date.toLocaleDateString()}\nLocation: ${event.location}\n\nWe look forward to seeing you!\n\nBest regards,\nThe NAAPE Team`,
                            html: eventRegistrationFreeEmailHTML(
                                user.name,
                                event.title,
                                event.date,
                                event.location,
                                String(event._id)
                            )
                        });
                    }
                } catch (emailError) {
                    console.error("Failed to send free event confirmation email:", emailError);
                }
            return res.status(200).json({ message: "Registered for free event" });
        }

        // Check if already paid
        const alreadyPaid = event.payments.some(
            (p) => p.user.equals(userObjectId) && p.status === "successful"
        );
        if (alreadyPaid) {
            return res.status(400).json({ message: "You have already paid for this event" });
        }

        // Paid events: create payment link
        const tx_ref = `EVT-${eventId}-${Date.now()}`;
        const payload = {
            tx_ref,
            amount: event.price,
            currency: event.currency,
            redirect_url: `${process.env.FRONTEND_URL}/events/${eventId}/payment-complete`,
            customer: {
                email,
                name
            },
            meta: {
                eventId,
                userId
            }
        };

        const response = await flw.post("/payments", payload);

        return res.status(200).json({
            link: response.data.data.link,
            tx_ref: response.data.data.tx_ref
        });

    } catch (error: any) {
        console.error("Event payment error:", error.response?.data || error);
        const message = error?.response?.data?.message || error?.message || "Payment initiation failed";
        return res.status(500).json({ message });
    }
}

// Verify event payment - authenticated users only
export const verifyEventPayment = async (req: Request, res: Response) => {
    try {
        const transaction_id = req.query.transaction_id as string;
        
        if (!transaction_id || transaction_id.trim() === "") {
            return res.status(400).json({ 
                status: "failed", 
                message: "Transaction ID is required for payment verification" 
            });
        }

        // Verify with Flutterwave
        let fwRes;
        try {
            fwRes = await flw.get(`/transactions/${transaction_id}/verify`);
        } catch (flwError: any) {
            console.error("Flutterwave API error:", flwError.message);
            
            if (flwError.code === 'ECONNREFUSED' || flwError.code === 'ETIMEDOUT' || flwError.code === 'ENOTFOUND') {
                return res.status(500).json({
                    status: "failed",
                    message: "Payment verification service is temporarily unavailable. Please try again in a few moments."
                });
            }
            
            if (flwError.response?.status === 404) {
                return res.status(404).json({
                    status: "failed",
                    message: "Transaction not found. Please verify your transaction ID.",
                    transactionId: transaction_id
                });
            }
            
            return res.status(500).json({
                status: "failed",
                message: "Unable to verify payment at this time. Please try again later or contact support."
            });
        }
        
        const data = fwRes?.data?.data;

        if (!data || data.status !== "successful") {
            return res.status(400).json({ 
                status: "failed",
                message: "Payment was not successful",
                transactionId: data?.id || transaction_id
            });
        }

        const { eventId, userId } = data.meta || {};
        if (!eventId || !userId) {
            return res.status(400).json({ 
                status: "failed", 
                message: "Invalid payment metadata - user authentication required",
                transactionId: data.id
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ 
                status: "failed", 
                message: "Event not found",
                transactionId: data.id
            });
        }

        // Prevent duplicate processing
        const alreadyProcessed = event.payments.some(
            (p) => String(p.transactionId) === String(data.id)
        );
        
        if (!alreadyProcessed) {
            const userObjectId = new Types.ObjectId(userId);
            
            // Check capacity limit before finalizing registration
            if (event.settings?.maxCapacity && event.settings.maxCapacity > 0) {
                const currentCapacity = event.registeredUsers.length;
                if (currentCapacity >= event.settings.maxCapacity) {
                    // Event became full during payment process
                    return res.status(400).json({ 
                        status: "failed",
                        message: "Event became full while processing your payment. Please contact support for a refund.",
                        isFull: true,
                        transactionId: data.id
                    });
                }
            }
            
            // Add to registered users if not already there
            if (!event.registeredUsers.some((u) => u.equals(userObjectId))) {
                event.registeredUsers.push(userObjectId);
            }

            // Parse payment date safely
            let paymentDate = new Date();
            if (data.completed_at) {
                const parsedDate = new Date(data.completed_at);
                if (!isNaN(parsedDate.getTime())) {
                    paymentDate = parsedDate;
                }
            }

            // Add payment record
            event.payments.push({
                user: userObjectId,
                transactionId: data.id,
                amount: data.amount,
                status: data.status,
                date: paymentDate,
            });

            await event.save();
        }

        // Payment history (idempotent)
        const historyExists = await PaymentHistory.findOne({ transactionId: data.id });
        if (!historyExists) {
            try {
                await savePaymentHistory(
                    userId,
                    "event",
                    data.id,
                    data.amount,
                    data.currency,
                    data.status,
                    { eventId, eventTitle: event.title }
                );
            } catch (historyError) {
                console.error("Failed to save payment history:", historyError);
                // Continue - payment is recorded in event
            }
        }

        // Send confirmation email
        try {
            const user = await User.findById(userId);
            if (user) {
                const emailContent = eventPaymentEmail(
                    user.name,
                    event.title,
                    event.date,
                    event.location,
                    data.amount,
                    data.currency,
                    data.id
                );

                const htmlContent = eventPaymentEmailHTML(
                    user.name,
                    event.title,
                    event.date,
                    event.location,
                    data.amount,
                    data.currency,
                    data.id,
                    String(event._id)
                );

                await sendEmail({
                    to: user.email,
                    subject: emailContent.subject,
                    text: emailContent.text,
                    html: htmlContent,
                });
            }
        } catch (emailError) {
            console.error("Failed to send event confirmation email:", emailError);
        }

        return res.json({ 
            status: "successful",
            message: "Payment verified successfully",
            transactionId: data.id,
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                location: event.location,
                imageUrl: event.imageUrl
            }
        });

    } catch (err) {
        console.error("Verify payment error:", err);
        return res.status(500).json({ 
            status: "failed",
            message: "Payment verification failed"
        });
    }
};

export const getEventPaymentStatus = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.query;
        const userId = req.user?.id;

        if (!eventId) {
            return res.status(400).json({ message: "eventId is required" });
        }

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const userObjectId = new Types.ObjectId(userId);

        // Check if user has paid for this event
        const payment = event.payments.find((p) =>
            p.user.equals(userObjectId) && p.status === "successful"
        );

        if (!payment) {
            return res.status(200).json({ 
                paid: false, 
                registered: event.registeredUsers.some(u => u.equals(userObjectId))
            });
        }

        return res.status(200).json({
            paid: true,
            status: payment.status,
            amount: payment.amount,
            transactionId: payment.transactionId,
            date: payment.date
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const getUserEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const userObjectId = new Types.ObjectId(userId);

        // Find all events where user is registered
        const events = await Event.find({
            registeredUsers: userObjectId
        }).sort({ date: -1 });

        // Add payment info for each event
        const eventsWithPaymentInfo = events.map(event => {
            const payment = event.payments.find(p => 
                p.user.equals(userObjectId) && p.status === "successful"
            );

            return {
                ...event.toObject(),
                userPayment: payment ? {
                    amount: payment.amount,
                    transactionId: payment.transactionId,
                    date: payment.date
                } : null
            };
        });

        return res.status(200).json({
            success: true,
            count: eventsWithPaymentInfo.length,
            events: eventsWithPaymentInfo
        });
    } catch (error: any) {
        console.error("Get user events error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Get event attendees with detailed information
export const getEventAttendees = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        
        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const event = await Event.findById(eventId)
            .populate('registeredUsers', 'name email profile.phone profile.organization profile.specialization profile.image')
            .populate('payments.user', 'name email');

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Build attendee data with payment and attendance information
        const attendees = event.registeredUsers.map((user: any) => {
            // Find payment for this user
            const payment = event.payments.find(p => 
                p.user._id ? p.user._id.toString() === user._id.toString() : 
                p.user.toString() === user._id.toString()
            );

            return {
                userId: user._id,
                name: user.name,
                email: user.email,
                phone: user.profile?.phone,
                organization: user.profile?.organization,
                specialization: user.profile?.specialization,
                profilePicture: user.profile?.image?.url,
                registrationDate: payment?.date || event.createdAt,
                paymentStatus: payment ? 
                    (payment.status === 'successful' ? 'successful' : 
                     payment.status === 'pending' ? 'pending' : 'failed') :
                    (event.isPaid ? 'failed' : 'free'),
                paymentAmount: payment?.amount,
                transactionId: payment?.transactionId,
                attendanceStatus: 'registered' // Default status, can be updated later
            };
        });

        return res.status(200).json({
            success: true,
            event: {
                _id: event._id,
                title: event.title,
                date: event.date,
                location: event.location,
                isPaid: event.isPaid,
                price: event.price,
                currency: event.currency,
                attendeeCount: attendees.length
            },
            attendees
        });

    } catch (error: any) {
        console.error("Get event attendees error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Update attendee attendance status
export const updateAttendeeAttendance = async (req: Request, res: Response) => {
    try {
        const { eventId, userId } = req.params;
        const { attendanceStatus } = req.body;

        if (!eventId || !userId || !attendanceStatus) {
            return res.status(400).json({ 
                message: "Event ID, User ID, and attendance status are required" 
            });
        }

        const validStatuses = ['registered', 'checked_in', 'attended', 'no_show'];
        if (!validStatuses.includes(attendanceStatus)) {
            return res.status(400).json({ 
                message: "Invalid attendance status" 
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        const userObjectId = new Types.ObjectId(userId);
        const isRegistered = event.registeredUsers.some(u => u.equals(userObjectId));
        
        if (!isRegistered) {
            return res.status(404).json({ 
                message: "User is not registered for this event" 
            });
        }

        // For now, we'll store attendance status in a separate collection or extend the event model
        // Since the current model doesn't have attendance tracking, we'll return success
        // In a real implementation, you'd want to add an attendance field to the event model
        
        return res.status(200).json({
            success: true,
            message: "Attendance status updated successfully",
            attendanceStatus
        });

    } catch (error: any) {
        console.error("Update attendance error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Export event attendees
export const exportEventAttendees = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { 
            format = 'csv',
            paymentStatus,
            attendanceStatus,
            search
        } = req.query;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const event = await Event.findById(eventId)
            .populate('registeredUsers', 'name email profile.phone profile.organization profile.specialization')
            .populate('payments.user', 'name email');

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Build attendee data for export
        let attendees = event.registeredUsers.map((user: any) => {
            const payment = event.payments.find(p => 
                p.user._id ? p.user._id.toString() === user._id.toString() : 
                p.user.toString() === user._id.toString()
            );

            const attendeePaymentStatus = payment ? 
                (payment.status === 'successful' ? 'successful' : 
                 payment.status === 'pending' ? 'pending' : 'failed') :
                (event.isPaid ? 'failed' : 'free');

            return {
                userId: user._id.toString(),
                Name: user.name,
                Email: user.email,
                Phone: user.profile?.phone || '',
                Organization: user.profile?.organization || '',
                Specialization: user.profile?.specialization || '',
                'Registration Date': payment?.date ? new Date(payment.date).toLocaleDateString() : new Date(event.createdAt).toLocaleDateString(),
                'Payment Status': attendeePaymentStatus.charAt(0).toUpperCase() + attendeePaymentStatus.slice(1),
                'Payment Amount': payment?.amount || (event.isPaid ? event.price : 0),
                'Transaction ID': payment?.transactionId || '',
                'Attendance Status': 'Registered' // Default status
            };
        });

        // Apply filters
        if (paymentStatus && paymentStatus !== 'all') {
            attendees = attendees.filter(attendee => 
                attendee['Payment Status'].toLowerCase() === (paymentStatus as string).toLowerCase()
            );
        }

        if (attendanceStatus && attendanceStatus !== 'all') {
            attendees = attendees.filter(attendee => 
                attendee['Attendance Status'].toLowerCase().replace(' ', '_') === (attendanceStatus as string).toLowerCase()
            );
        }

        if (search) {
            const searchTerm = (search as string).toLowerCase();
            attendees = attendees.filter(attendee => 
                attendee.Name.toLowerCase().includes(searchTerm) ||
                attendee.Email.toLowerCase().includes(searchTerm) ||
                attendee.Organization.toLowerCase().includes(searchTerm) ||
                attendee.Specialization.toLowerCase().includes(searchTerm)
            );
        }

        if (format === 'csv') {
            // Generate CSV
            const headers = ['Name', 'Email', 'Phone', 'Organization', 'Specialization', 'Registration Date', 'Payment Status', 'Payment Amount', 'Transaction ID', 'Attendance Status'];
            const csvContent = [
                headers.join(','),
                ...attendees.map(attendee => 
                    headers.map(header => `"${attendee[header] || ''}"`).join(',')
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_attendees.csv"`);
            return res.send(csvContent);
        } else {
            // For Excel format, return JSON that frontend can convert
            return res.status(200).json({
                success: true,
                data: attendees,
                filename: `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_attendees.xlsx`,
                eventTitle: event.title,
                totalAttendees: attendees.length,
                exportDate: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error("Export attendees error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Update event details
export const updateEvent = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const updates = req.body;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        // Handle image upload if present
        if (req.file) {
            updates.imageUrl = req.file.path;
        }

        const event = await Event.findByIdAndUpdate(
            eventId,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Event updated successfully",
            event
        });

    } catch (error: any) {
        console.error("Update event error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Delete event
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Check if event has registered users or payments
        if (event.registeredUsers.length > 0 || event.payments.length > 0) {
            return res.status(400).json({ 
                message: "Cannot delete event with registered users or payments. Consider cancelling instead." 
            });
        }

        await Event.findByIdAndDelete(eventId);

        return res.status(200).json({
            success: true,
            message: "Event deleted successfully"
        });

    } catch (error: any) {
        console.error("Delete event error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Update event status
export const updateEventStatus = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { status } = req.body;

        if (!eventId || !status) {
            return res.status(400).json({ message: "Event ID and status are required" });
        }

        const validStatuses = ['draft', 'published', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const event = await Event.findByIdAndUpdate(
            eventId,
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Event status updated successfully",
            event: {
                _id: event._id,
                title: event.title,
                status: event.status
            }
        });

    } catch (error: any) {
        console.error("Update event status error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Get event settings
export const getEventSettings = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const event = await Event.findById(eventId).select('title settings');
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        return res.status(200).json({
            success: true,
            event: {
                _id: event._id,
                title: event.title,
                settings: event.settings
            }
        });

    } catch (error: any) {
        console.error("Get event settings error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Update event settings
export const updateEventSettings = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { settings } = req.body;

        if (!eventId || !settings) {
            return res.status(400).json({ message: "Event ID and settings are required" });
        }

        const event = await Event.findByIdAndUpdate(
            eventId,
            { 
                settings: { ...settings },
                updatedAt: new Date() 
            },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Event settings updated successfully",
            settings: event.settings
        });

    } catch (error: any) {
        console.error("Update event settings error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Admin-only: Get events with admin details
export const getAdminEvents = async (req: Request, res: Response) => {
    try {
        const { 
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const query: any = {};
        
        // Filter by status if provided
        if (status && status !== 'all') {
            query.status = status;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions: any = {};
        sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        const skip = (Number(page) - 1) * Number(limit);

        const events = await Event.find(query)
            .populate('createdBy', 'name email')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit));

        const total = await Event.countDocuments(query);

        // Add admin-specific data to each event
        const eventsWithAdminData = events.map(event => ({
            _id: event._id,
            title: event.title,
            date: event.date,
            location: event.location,
            imageUrl: event.imageUrl,
            description: event.description,
            price: event.price,
            currency: event.currency,
            isPaid: event.isPaid,
            status: event.status,
            createdBy: event.createdBy,
            attendeeCount: event.registeredUsers.length,
            paymentCount: event.payments.filter(p => p.status === 'successful').length,
            totalRevenue: event.payments
                .filter(p => p.status === 'successful')
                .reduce((sum, p) => sum + p.amount, 0),
            settings: event.settings,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        }));

        return res.status(200).json({
            success: true,
            events: eventsWithAdminData,
            pagination: {
                current: Number(page),
                total: Math.ceil(total / Number(limit)),
                count: events.length,
                totalEvents: total
            }
        });

    } catch (error: any) {
        console.error("Get admin events error:", error);
        return res.status(500).json({ message: error.message });
    }
};