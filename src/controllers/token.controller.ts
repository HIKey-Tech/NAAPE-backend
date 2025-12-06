import { Request, Response } from "express";
import { flw } from "../utils/flw.client";
import { savePaymentHistory } from "../utils/savePaymentHistory";

/**
 * Charge & tokenize card (first-time)
 * POST /api/card/tokenize
 * { amount, currency, customer, card: { number, cvv, expiry_month, expiry_year } }
 */
export const chargeAndTokenize = async (req: Request, res: Response) => {
    try {
        // The front-end should ideally use Flutterwave Checkout to collect card in a PCI-compliant flow.
        // If you need server-side, follow encrypt/3DES flow in docs. Here is a simplified example.
        const { amount, currency = "NGN", customer, card } = req.body;

        const payload: any = {
            tx_ref: `tok-${Date.now()}`,
            amount,
            currency,
            authorization: {
                mode: "card",
            },
            customer,
            // You may need to encrypt card details and follow 3DS flow per Flutterwave docs.
            // For some flows you send "save_card": true or "tokenize": true depending on API methods.
        };

        // Many integrations use the hosted checkout to tokenize (recommended); if doing server-side,
        // you'd call the charge endpoint documented in tokenization guide.
        const r = await flw.post("/charges", payload);

        // Attempt to save payment history if response is successful
        if (r?.data?.status === "success" && r?.data?.data) {
            const chargeData = r.data.data;
            await savePaymentHistory(
                customer?.id || customer?.email || "", // Try customer id, fallback to email, else empty
                "tokenize",
                chargeData.id || payload.tx_ref,
                amount,
                currency,
                chargeData.status || "pending",
                {
                    token: chargeData?.card?.token,
                    customer: customer,
                    cardLast4: chargeData?.card?.last_4digits,
                    tx_ref: payload.tx_ref
                }
            );
        }
        
        // the response may contain token details depending on the flow
        return res.json(r.data);
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "tokenize/charge failed" });
    }
};

/**
 * Create a tokenized charge (using an existing token)
 * POST /api/token-charges
 * { token, amount, currency, tx_ref }
 */
export const createTokenizedCharge = async (req: Request, res: Response) => {
    try {
        const { token, amount, currency = "NGN" } = req.body;
        const tx_ref = `tkncharge-${Date.now()}`;
        const r = await flw.post("/tokenized-charges", {
            token,
            amount,
            currency,
            tx_ref,
        });

        // Attempt to save payment history if response is successful
        if (r?.data?.status === "success" && r?.data?.data) {
            const chargeData = r.data.data;
            await savePaymentHistory(
                chargeData?.customer?.id || "", // If possible, use the customer ID
                "tokenized_charge",
                chargeData.id || tx_ref,
                amount,
                currency,
                chargeData.status || "pending",
                {
                    token,
                    tx_ref
                }
            );
        }

        return res.json(r.data);
    } catch (err: any) {
        console.error(err?.response?.data || err.message);
        return res.status(500).json({ error: "tokenized charge failed" });
    }
};
