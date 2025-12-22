import { Request, Response } from "express";
import MembershipForm from "../models/MembershipForm";

// Create a new membership form
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export const createMembershipForm = async (req: Request, res: Response) => {
    try {
        // 1. Save the membership form to the database
        const form = await MembershipForm.create(req.body);

        // 2. Prepare fields to email
        const {
            name,
            tel,
            email,
            address,
            designation,
            dateOfEmployment,
            section,
            qualification,
            licenseNo,
            employer,
            rank,
            signature,
            date
        } = form;

        // Format additional fields to string
        const formatted = [
            `Address: ${address}`,
            designation ? `Designation: ${designation}` : "",
            dateOfEmployment ? `Date of Employment: ${dateOfEmployment instanceof Date ? dateOfEmployment.toISOString().slice(0, 10) : dateOfEmployment}` : "",
            section ? `Section: ${section}` : "",
            qualification ? `Qualification: ${qualification}` : "",
            licenseNo ? `License No: ${licenseNo}` : "",
            employer ? `Employer: ${employer}` : "",
            rank ? `Rank: ${rank}` : "",
            `Signature: ${signature}`,
            `Date: ${date instanceof Date ? date.toISOString().slice(0, 10) : date}`
        ].filter(Boolean).join("\n");

        // 3. Send email to NAAPE Admin
        await sgMail.send({
            to: "info@naape.org.ng",
            from: "no-reply@naape.org",
            subject: "New NAAPE Membership Application",
            text: `Name: ${name}\nTel: ${tel}\n\n${formatted}`,
        });

        // 4. Confirmation email to applicant, 
        if (typeof email === "string" && tel.includes("@")) {
            await sgMail.send({
                to: email,
                from: "no-reply@naape.org",
                subject: "NAAPE Membership Form Received",
                text: `Hello ${name},\n\nYour membership application has been received.\nWe will contact you shortly.\n\nNAAPE Secretariat`,
            });
        }

        res.status(201).json(form);
    } catch (err: any) {
        console.error("Membership form creation/email error:", err);
        res.status(400).json({ error: err.message || "Failed to submit membership form" });
    }
};

// Get all membership forms
export const getAllMembershipForms = async (_req: Request, res: Response) => {
    try {
        const forms = await MembershipForm.find().sort({ createdAt: -1 });
        res.json(forms);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Get a single membership form by ID
export const getMembershipFormById = async (req: Request, res: Response) => {
    try {
        const form = await MembershipForm.findById(req.params.id);
        if (!form) {
            return res.status(404).json({ error: "Membership form not found" });
        }
        res.json(form);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// Update a membership form by ID
export const updateMembershipForm = async (req: Request, res: Response) => {
    try {
        const form = await MembershipForm.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!form) {
            return res.status(404).json({ error: "Membership form not found" });
        }
        res.json(form);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

// Delete a membership form by ID
export const deleteMembershipForm = async (req: Request, res: Response) => {
    try {
        const form = await MembershipForm.findByIdAndDelete(req.params.id);
        if (!form) {
            return res.status(404).json({ error: "Membership form not found" });
        }
        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
