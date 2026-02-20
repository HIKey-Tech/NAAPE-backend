import { Request, Response } from "express";
import sendEmail from "../utils/sendEmail";

export const handleContactForm = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Send to an admin or central email address
        const toEmail = process.env.CONTACT_EMAIL || "info@naape.org.ng";

        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #1e3a8a;">New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <h3 style="color: #333;">Message:</h3>
                <p style="white-space: pre-wrap; color: #555; line-height: 1.5;">${message}</p>
            </div>
        `;

        await sendEmail({
            to: toEmail,
            subject: `New NAAPE Contact Form Submission from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            html: emailHtml,
        });

        return res.status(200).json({ message: "Message sent successfully" });
    } catch (error: any) {
        console.error("Error in contact form:", error);
        return res.status(500).json({ message: "Failed to send message", error: error.message });
    }
};
