// src/controllers/transferController.ts
import { Request, Response } from "express";
import { flw } from "../utils/flw.client";

/**
 * Create recipient
 * POST /api/recipients
 * { name, account_number, bank_code, currency }
 */
export const createRecipient = async (req: Request, res: Response) => {
    try {
        const { name, account_number, bank_code, currency = "NGN" } = req.body;
        const r = await flw.post("/transfers/recipients", {
            type: "bank",
            name,
            account_number,
            bank_code,
            currency,
        });
        return res.json(r.data);
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "create recipient failed" });
    }
};

/**
 * Create transfer
 * POST /api/transfers
 * { recipient, amount, currency, narration }
 */
export const createTransfer = async (req: Request, res: Response) => {
    try {
        const { recipient, amount, currency = "NGN", narration = "Payout" } = req.body;
        const r = await flw.post("/transfers", {
            recipient,
            amount,
            currency,
            narration,
            reference: `transfer-${Date.now()}`,
            // optional: payout_subaccount, debit_currency, etc
        });
        return res.json(r.data);
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "transfer failed" });
    }
};
