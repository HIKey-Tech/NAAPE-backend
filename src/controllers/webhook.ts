// src/controllers/webhook.ts
import { Request, Response } from "express";

export const handleWebhook = async (req: Request, res: Response) => {
    const signature = req.headers["verif-hash"] as string | undefined;
    if (!signature || signature !== process.env.FLW_HASH) {
        return res.status(401).send("unauthorised");
    }
    // process req.body (event) — update DB accordingly
    res.json({ status: "ok" });
};
