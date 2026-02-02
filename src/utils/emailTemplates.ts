/**
 * Email templates for payment notifications
 */

export const subscriptionPaymentEmail = (
    userName: string,
    planName: string,
    amount: number,
    currency: string,
    transactionId: string,
    startDate: Date,
    endDate: Date
) => {
    return {
        subject: `Subscription Payment Confirmation - ${planName.toUpperCase()} Plan`,
        text: `
Dear ${userName},

Thank you for subscribing to NAAPE!

Your subscription payment has been successfully processed.

SUBSCRIPTION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan: ${planName.toUpperCase()}
Amount Paid: ${currency} ${amount.toLocaleString()}
Transaction ID: ${transactionId}
Start Date: ${startDate.toLocaleDateString()}
End Date: ${endDate.toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You now have full access to all ${planName} membership benefits including:
- Access to exclusive publications
- Ability to create and submit publications
- Member-only events and resources
- And much more!

If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
The NAAPE Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply to this email.
        `.trim(),
    };
};

export const eventPaymentEmail = (
    userName: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
    amount: number,
    currency: string,
    transactionId: string
) => {
    return {
        subject: `Event Registration Confirmation - ${eventTitle}`,
        text: `
Dear ${userName},

Thank you for registering for our event!

Your payment has been successfully processed and your registration is confirmed.

EVENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event: ${eventTitle}
Date: ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString()}
Location: ${eventLocation}
Amount Paid: ${currency} ${amount.toLocaleString()}
Transaction ID: ${transactionId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We look forward to seeing you at the event!

Please save this email as your registration confirmation. You may be asked to present this at the event.

If you have any questions, please contact us.

Best regards,
The NAAPE Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply to this email.
        `.trim(),
    };
};

export const paymentReceiptEmail = (
    userName: string,
    paymentType: string,
    amount: number,
    currency: string,
    transactionId: string,
    paymentDate: Date
) => {
    return {
        subject: `Payment Receipt - ${transactionId}`,
        text: `
Dear ${userName},

This is your payment receipt from NAAPE.

PAYMENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment Type: ${paymentType}
Amount: ${currency} ${amount.toLocaleString()}
Transaction ID: ${transactionId}
Date: ${paymentDate.toLocaleDateString()} at ${paymentDate.toLocaleTimeString()}
Status: Successful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your payment.

If you have any questions about this transaction, please contact us with the transaction ID above.

Best regards,
The NAAPE Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply to this email.
        `.trim(),
    };
};
