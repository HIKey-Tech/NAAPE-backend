import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"NAAPE" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        text,
    });
};

export default sendEmail;
