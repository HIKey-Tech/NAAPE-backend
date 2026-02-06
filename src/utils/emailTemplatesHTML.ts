/**
 * Comprehensive HTML Email templates for NAAPE
 * Professional design with company branding
 */

const emailHeader = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .logo-section { background: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #2C6ED4; }
        .logo-section img { max-width: 180px; height: auto; }
        .header { background: linear-gradient(135deg, #2C6ED4 0%, #1a4d8f 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
        .content { padding: 30px 25px; }
        .greeting { font-size: 16px; margin-bottom: 20px; }
        .details-box { background: #f8f9fa; border-left: 4px solid #2C6ED4; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .details-box h3 { margin-top: 0; color: #2C6ED4; font-size: 18px; }
        .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
        .details-row:last-child { border-bottom: none; }
        .details-label { font-weight: 600; color: #555; }
        .details-value { color: #333; text-align: right; }
        .info-box { background: #e8f4ff; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2C6ED4; }
        .info-box ul { margin: 10px 0; padding-left: 20px; }
        .info-box li { margin: 8px 0; }
        .warning-box { background: #fff3cd; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .success-box { background: #d4edda; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #28a745; }
        .button { display: inline-block; background: #2C6ED4; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
        .button:hover { background: #1a4d8f; }
        .footer { background: #2C6ED4; color: #ffffff; padding: 30px 20px; text-align: center; }
        .footer-content { margin-bottom: 15px; }
        .footer-links { margin: 15px 0; }
        .footer-links a { color: #ffffff; text-decoration: none; margin: 0 10px; }
        .footer-info { font-size: 12px; color: #e0e0e0; margin-top: 15px; }
        .footer-info p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-section">
            <img src="${process.env.FRONTEND_URL}/logo.png" alt="NAAPE Logo" />
        </div>
`;

const emailFooter = `
        <div class="footer">
            <div class="footer-content">
                <h3 style="margin: 0 0 10px 0; font-size: 18px;">Nigerian Association of Aircraft Pilots and Engineers</h3>
                <p style="margin: 5px 0;">Advancing Excellence in Aviation</p>
            </div>
            <div class="footer-links">
                <a href="${process.env.FRONTEND_URL}">Home</a> |
                <a href="${process.env.FRONTEND_URL}/about">About Us</a> |
                <a href="${process.env.FRONTEND_URL}/contact">Contact</a> |
                <a href="${process.env.FRONTEND_URL}/events">Events</a>
            </div>
            <div class="footer-info">
                <p>Email: info@naape.ng | Support: support@naape.ng</p>
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} NAAPE. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

// ============================================
// AUTHENTICATION EMAILS
// ============================================

export const welcomeEmailHTML = (userName: string, userEmail: string) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Welcome to NAAPE!</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>Thank you for joining the Nigerian Association of Aircraft Pilots and Engineers (NAAPE). We are delighted to have you as part of our professional community.</p>
            
            <div class="success-box">
                <h3 style="margin-top: 0; color: #28a745;">Account Successfully Created</h3>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p>Your account has been created and you can now access our platform.</p>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0;">What's Next?</h3>
                <ul>
                    <li>Complete your professional profile</li>
                    <li>Explore upcoming events and training opportunities</li>
                    <li>Connect with fellow aviation professionals</li>
                    <li>Access exclusive publications and resources</li>
                    <li>Subscribe to unlock premium features</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </p>

            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const loginNotificationEmailHTML = (userName: string, loginTime: Date, ipAddress?: string) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>New Login Detected</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>We detected a new login to your NAAPE account.</p>
            
            <div class="details-box">
                <h3>Login Details</h3>
                <div class="details-row">
                    <span class="details-label">Date & Time:</span>
                    <span class="details-value">${loginTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${loginTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                ${ipAddress ? `
                <div class="details-row">
                    <span class="details-label">IP Address:</span>
                    <span class="details-value">${ipAddress}</span>
                </div>
                ` : ''}
            </div>

            <div class="warning-box">
                <p style="margin: 0;"><strong>Was this you?</strong></p>
                <p style="margin: 10px 0 0 0;">If you did not perform this login, please secure your account immediately by changing your password.</p>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/profile" class="button">Manage Account Security</a>
            </p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

// ============================================
// SUBSCRIPTION EMAILS
// ============================================

export const subscriptionPaymentEmailHTML = (
    userName: string,
    planName: string,
    amount: number,
    currency: string,
    transactionId: string,
    startDate: Date,
    endDate: Date
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Subscription Confirmed</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>Thank you for subscribing to NAAPE! Your payment has been successfully processed and your subscription is now active.</p>
            
            <div class="details-box">
                <h3>Subscription Details</h3>
                <div class="details-row">
                    <span class="details-label">Plan:</span>
                    <span class="details-value">${planName.toUpperCase()}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Amount Paid:</span>
                    <span class="details-value">${currency} ${amount.toLocaleString()}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Transaction ID:</span>
                    <span class="details-value">${transactionId}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Start Date:</span>
                    <span class="details-value">${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">End Date:</span>
                    <span class="details-value">${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            <div class="info-box">
                <h3>Your ${planName.toUpperCase()} Membership Benefits</h3>
                <ul>
                    <li>Full access to all exclusive publications</li>
                    <li>Create and submit your own publications</li>
                    <li>Access to member-only events and resources</li>
                    <li>Priority support from our team</li>
                    <li>Networking opportunities with industry professionals</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </p>

            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

// ============================================
// EVENT EMAILS
// ============================================

export const eventPaymentEmailHTML = (
    userName: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
    amount: number,
    currency: string,
    transactionId: string,
    eventId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Event Registration Confirmed</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>Thank you for registering! Your payment has been successfully processed and your registration is confirmed.</p>
            
            <div class="details-box">
                <h3>Event Details</h3>
                <div class="details-row">
                    <span class="details-label">Event:</span>
                    <span class="details-value">${eventTitle}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Date & Time:</span>
                    <span class="details-value">${eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Location:</span>
                    <span class="details-value">${eventLocation}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Amount Paid:</span>
                    <span class="details-value">${currency} ${amount.toLocaleString()}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Transaction ID:</span>
                    <span class="details-value">${transactionId}</span>
                </div>
            </div>

            <div class="warning-box">
                <h3 style="margin-top: 0; color: #856404;">Important Reminders</h3>
                <ul style="margin: 10px 0;">
                    <li>Please save this email as your registration confirmation</li>
                    <li>You may be asked to present this at the event</li>
                    <li>Arrive 15 minutes early for check-in</li>
                    <li>Bring a valid ID for verification</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/events/${eventId}" class="button">View Event Details</a>
            </p>

            <p>We look forward to seeing you at the event!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const eventRegistrationFreeEmailHTML = (
    userName: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
    eventId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Event Registration Confirmed</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>Thank you for registering for our event! Your registration has been confirmed.</p>
            
            <div class="details-box">
                <h3>Event Details</h3>
                <div class="details-row">
                    <span class="details-label">Event:</span>
                    <span class="details-value">${eventTitle}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Date & Time:</span>
                    <span class="details-value">${eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Location:</span>
                    <span class="details-value">${eventLocation}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Registration Fee:</span>
                    <span class="details-value">FREE</span>
                </div>
            </div>

            <div class="warning-box">
                <h3 style="margin-top: 0; color: #856404;">Important Reminders</h3>
                <ul style="margin: 10px 0;">
                    <li>Please save this email as your registration confirmation</li>
                    <li>Arrive 15 minutes early for check-in</li>
                    <li>Bring a valid ID for verification</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/events/${eventId}" class="button">View Event Details</a>
            </p>

            <p>We look forward to seeing you at the event!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const newEventNotificationEmailHTML = (
    userName: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
    eventDescription: string,
    eventPrice: number,
    currency: string,
    eventId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>New Event Announcement</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>We are excited to announce a new event that you might be interested in!</p>
            
            <div class="details-box">
                <h3>${eventTitle}</h3>
                <div class="details-row">
                    <span class="details-label">Date & Time:</span>
                    <span class="details-value">${eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Location:</span>
                    <span class="details-value">${eventLocation}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Registration Fee:</span>
                    <span class="details-value">${eventPrice > 0 ? `${currency} ${eventPrice.toLocaleString()}` : 'FREE'}</span>
                </div>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0;">About This Event</h3>
                <p>${eventDescription}</p>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/events/${eventId}" class="button">Register Now</a>
            </p>

            <p>Don't miss this opportunity to connect with fellow aviation professionals and expand your knowledge!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

// ============================================
// PUBLICATION EMAILS
// ============================================

export const publicationSubmittedEmailHTML = (
    userName: string,
    publicationTitle: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Publication Submitted</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>Thank you for submitting your publication to NAAPE. We have received your submission and it is now under review.</p>
            
            <div class="details-box">
                <h3>Submission Details</h3>
                <div class="details-row">
                    <span class="details-label">Title:</span>
                    <span class="details-value">${publicationTitle}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Status:</span>
                    <span class="details-value">Pending Review</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Submitted:</span>
                    <span class="details-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0;">What Happens Next?</h3>
                <ul>
                    <li>Our editorial team will review your publication</li>
                    <li>The review process typically takes 2-5 business days</li>
                    <li>You will receive an email notification once the review is complete</li>
                    <li>You can track the status in your dashboard</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/publications" class="button">View My Publications</a>
            </p>

            <p>Thank you for contributing to our professional community!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const publicationApprovedEmailHTML = (
    userName: string,
    publicationTitle: string,
    publicationId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Publication Approved</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>Congratulations! Your publication has been approved and is now live on the NAAPE platform.</p>
            
            <div class="success-box">
                <h3 style="margin-top: 0; color: #28a745;">Publication Approved</h3>
                <p><strong>Title:</strong> ${publicationTitle}</p>
                <p>Your publication is now visible to all NAAPE members and visitors.</p>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0;">What's Next?</h3>
                <ul>
                    <li>Your publication is now accessible to the aviation community</li>
                    <li>Members can read, comment, and engage with your content</li>
                    <li>You will receive notifications when members comment on your publication</li>
                    <li>Share your publication on social media to reach a wider audience</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/publications/${publicationId}" class="button">View Publication</a>
            </p>

            <p>Thank you for your valuable contribution to the aviation community!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const publicationRejectedEmailHTML = (
    userName: string,
    publicationTitle: string,
    reason?: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Publication Review Update</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>Thank you for your submission. After careful review, we regret to inform you that your publication could not be approved at this time.</p>
            
            <div class="warning-box">
                <h3 style="margin-top: 0; color: #856404;">Publication Not Approved</h3>
                <p><strong>Title:</strong> ${publicationTitle}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0;">What You Can Do</h3>
                <ul>
                    <li>Review our publication guidelines</li>
                    <li>Make necessary revisions to your content</li>
                    <li>Resubmit your publication for review</li>
                    <li>Contact our editorial team for clarification</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/publications" class="button">View My Publications</a>
            </p>

            <p>We encourage you to revise and resubmit your publication. If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const adminPublicationNotificationEmailHTML = (
    adminName: string,
    authorName: string,
    publicationTitle: string,
    publicationId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>New Publication Submitted</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${adminName}</strong>,</p>
            <p>A new publication has been submitted and requires your review.</p>
            
            <div class="details-box">
                <h3>Submission Details</h3>
                <div class="details-row">
                    <span class="details-label">Title:</span>
                    <span class="details-value">${publicationTitle}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Author:</span>
                    <span class="details-value">${authorName}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Submitted:</span>
                    <span class="details-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Status:</span>
                    <span class="details-value">Pending Review</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/admin/publications" class="button">Review Publication</a>
            </p>

            <p>Please review this publication at your earliest convenience.</p>
            
            <p>Best regards,<br><strong>The NAAPE System</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const newPublicationNotificationEmailHTML = (
    userName: string,
    publicationTitle: string,
    authorName: string,
    publicationId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>New Publication Available</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>A new publication has been added to the NAAPE platform that you might find interesting.</p>
            
            <div class="details-box">
                <h3>${publicationTitle}</h3>
                <div class="details-row">
                    <span class="details-label">Author:</span>
                    <span class="details-value">${authorName}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Published:</span>
                    <span class="details-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/publications/${publicationId}" class="button">Read Publication</a>
            </p>

            <p>Stay informed with the latest insights from the aviation community!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const commentNotificationEmailHTML = (
    userName: string,
    publicationTitle: string,
    commenterName: string,
    commentText: string,
    publicationId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>New Comment on Your Publication</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p><strong>${commenterName}</strong> has commented on your publication.</p>
            
            <div class="details-box">
                <h3>Publication</h3>
                <p><strong>${publicationTitle}</strong></p>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0;">Comment</h3>
                <p style="font-style: italic;">"${commentText.substring(0, 200)}${commentText.length > 200 ? '...' : ''}"</p>
                <p style="margin-top: 10px;"><strong>- ${commenterName}</strong></p>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/publications/${publicationId}" class="button">View Comment</a>
            </p>

            <p>Engage with your readers and continue the conversation!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

// ============================================
// NEWS EMAILS
// ============================================

export const newNewsNotificationEmailHTML = (
    userName: string,
    newsTitle: string,
    newsCategory: string,
    newsId: string
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Latest News from NAAPE</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>We have published new content that you might find interesting.</p>
            
            <div class="details-box">
                <h3>${newsTitle}</h3>
                <div class="details-row">
                    <span class="details-label">Category:</span>
                    <span class="details-value">${newsCategory}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Published:</span>
                    <span class="details-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/news/naape/${newsId}" class="button">Read More</a>
            </p>

            <p>Stay updated with the latest news and developments in the aviation industry!</p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

// ============================================
// PAYMENT RECEIPT EMAIL
// ============================================

export const paymentReceiptEmailHTML = (
    userName: string,
    paymentType: string,
    amount: number,
    currency: string,
    transactionId: string,
    paymentDate: Date
) => {
    return `
        ${emailHeader}
        <div class="header">
            <h1>Payment Receipt</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${userName}</strong>,</p>
            <p>This is your official payment receipt from NAAPE.</p>
            
            <div class="details-box">
                <h3>Payment Details</h3>
                <div class="details-row">
                    <span class="details-label">Payment Type:</span>
                    <span class="details-value">${paymentType}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Amount:</span>
                    <span class="details-value">${currency} ${amount.toLocaleString()}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Transaction ID:</span>
                    <span class="details-value">${transactionId}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Date:</span>
                    <span class="details-value">${paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${paymentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Status:</span>
                    <span class="details-value" style="color: #28a745; font-weight: bold;">Successful</span>
                </div>
            </div>

            <p>Thank you for your payment. If you have any questions about this transaction, please contact us with the transaction ID above.</p>
            
            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/payments" class="button">View Payment History</a>
            </p>
            
            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
        ${emailFooter}
    `;
};

export const forumReplyNotificationEmailHTML = (
    authorName: string,
    threadTitle: string,
    replierName: string,
    replyText: string,
    threadId: string
): string => {
    return `
${emailHeader}
        <div class="header">
            <h1>💬 New Reply on Your Thread</h1>
        </div>
        <div class="content">
            <p class="greeting">Hi <strong>${authorName}</strong>,</p>
            <p><strong>${replierName}</strong> has replied to your forum thread:</p>
            
            <div class="details-box">
                <h3>${threadTitle}</h3>
                <p style="color: #666; font-style: italic; margin: 10px 0;">"${replyText}"</p>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/forum/threads/${threadId}" class="button">View Thread & Reply</a>
            </div>

            <div class="info-box">
                <p><strong>💡 Tip:</strong> Keep the conversation going! Engage with your community members to build stronger connections.</p>
            </div>

            <p>Best regards,<br><strong>The NAAPE Team</strong></p>
        </div>
${emailFooter}
    `;
};
