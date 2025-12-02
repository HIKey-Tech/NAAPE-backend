import axios from "axios";
import { Request, Response } from "express";

export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const tx_ref = (req.query as { tx_ref?: string }).tx_ref;
        if (!tx_ref) {
            return res.status(400).json({
                status: "error",
                message: "Transaction reference (tx_ref) is required."
            });
        }

        const response = await axios.get(
            `${process.env.FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${tx_ref}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
                }
            }
        );

        return res.status(200).json(response.data);

    } catch (error: any) {
        return res.status(500).json({
            status: "error",
            message: error?.response?.data || error?.message || "An error occurred"
        });
    }
};
