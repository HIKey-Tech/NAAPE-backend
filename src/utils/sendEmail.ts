import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
    try {
        const msg = {
            to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || "noreply@naape.ng",
                name: "NAAPE"
            },
            subject,
            text,
            html: html || text.replace(/\n/g, "<br>"), // Convert text to basic HTML if no HTML provided
        };

        await sgMail.send(msg);
        console.log(`Email sent successfully to ${to}`);
    } catch (error: any) {
        console.error("SendGrid email error:", error);
        if (error.response) {
            console.error("SendGrid error details:", error.response.body);
        }
        throw error;
    }
};

export default sendEmail;
