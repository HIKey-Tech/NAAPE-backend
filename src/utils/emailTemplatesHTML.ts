/**
 * HTML Email templates for payment notifications
 * These provide better formatting and branding
 */

const emailHeader = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2C6ED4 0%, #1a4d8f 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 20px; }
        .details-box { background: #f8f9fa; border-left: 4px solid #2C6ED4; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .details-box h3 { margin-top: 0; color: #2C6ED4; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
        .details-row:last-child { border-bottom: none; }
        .details-label { font-weight: bold; color: #555; }
        .details-value { color: #333; }
        .benefits { background: #e8f4ff; padding: 20px; border-radius: 4px; margin: 20px 0; }
        .benefits ul { margin: 10px 0; padding-left: 20px; }
        .benefits li { margin: 8px 0; }
        .button { display: inline-block; background: #2C6ED4; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .footer a { color: #2C6ED4; text-decoration: none; }
    </style>
</head>
<body>
`;

const emailFooter = `
    <div class="footer">
        <p>This is an automated message from NAAPE. Please do not reply to this email.</p>
        <p>If you have any questions, please contact us at <a href="mailto:support@naape.ng">support@naape.ng</a></p>
        <p>&copy; ${new Date().getFullYear()} Nigerian Association of Aircraft Pilots and Engineers (NAAPE). All rights reserved.</p>
    </div>
</body>
</html>
`;

export const subscriptionPaymentEmailHTML = (
    userName: string,
    planName: string,
    amount: number,
    currency: string,
    transactionId: string,
    startDate: Date,
    endDate: Date
) => {
    const html = `
        ${emailHeader}
        <div class="container">
            <div class="header">
                <h1>🎉 Subscription Confirmed!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${userName}</strong>,</p>
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

                <div class="benefits">
                    <h3>Your ${planName.toUpperCase()} Membership Benefits:</h3>
                    <ul>
                        <li>✓ Full access to all exclusive publications</li>
                        <li>✓ Create and submit your own publications</li>
                        <li>✓ Access to member-only events and resources</li>
                        <li>✓ Priority support from our team</li>
                        <li>✓ Networking opportunities with industry professionals</li>
                    </ul>
                </div>

                <p style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                </p>

                <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br><strong>The NAAPE Team</strong></p>
            </div>
            ${emailFooter}
        </div>
    `;

    return html;
};

export const eventPaymentEmailHTML = (
    userName: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
    amount: number,
    currency: string,
    transactionId: string
) => {
    const html = `
        ${emailHeader}
        <div class="container">
            <div class="header">
                <h1>✅ Event Registration Confirmed!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${userName}</strong>,</p>
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

                <div class="benefits" style="background: #fff3cd; border-left: 4px solid #ffc107;">
                    <h3>⚠️ Important Reminders:</h3>
                    <ul>
                        <li>Please save this email as your registration confirmation</li>
                        <li>You may be asked to present this at the event</li>
                        <li>Arrive 15 minutes early for check-in</li>
                        <li>Bring a valid ID for verification</li>
                    </ul>
                </div>

                <p style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/events" class="button">View Event Details</a>
                </p>

                <p>We look forward to seeing you at the event!</p>
                
                <p>Best regards,<br><strong>The NAAPE Team</strong></p>
            </div>
            ${emailFooter}
        </div>
    `;

    return html;
};

export const paymentReceiptEmailHTML = (
    userName: string,
    paymentType: string,
    amount: number,
    currency: string,
    transactionId: string,
    paymentDate: Date
) => {
    const html = `
        ${emailHeader}
        <div class="container">
            <div class="header">
                <h1>📄 Payment Receipt</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${userName}</strong>,</p>
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
                        <span class="details-value" style="color: #28a745; font-weight: bold;">✓ Successful</span>
                    </div>
                </div>

                <p>Thank you for your payment. If you have any questions about this transaction, please contact us with the transaction ID above.</p>
                
                <p style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/payments" class="button">View Payment History</a>
                </p>
                
                <p>Best regards,<br><strong>The NAAPE Team</strong></p>
            </div>
            ${emailFooter}
        </div>
    `;

    return html;
};
