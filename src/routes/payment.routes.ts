// src/routes/paymentRoutes.ts
import { Router } from "express";

import { createPayment } from "../controllers/payment.controller";
import { createPlan, createSubscription } from "../controllers/subscription.controller";
import { chargeAndTokenize, createTokenizedCharge } from "../controllers/token.controller";
import { createRecipient, createTransfer } from "../controllers/transfer.controller";
import { handleWebhook } from "../controllers/webhook";
import { registerEventPayment, verifyEventPayment } from "../controllers/event.controller";

const router = Router();

// Standard checkout payment link
router.post("/create-link", createPayment);

// Payment plans & subscriptions
router.post("/plans", createPlan);
router.post("/subscriptions", createSubscription);

// Tokenization
router.post("/tokenize", chargeAndTokenize);
router.post("/token-charges", createTokenizedCharge);

// Payouts / Transfers
router.post("/recipients", createRecipient);
router.post("/transfers", createTransfer);

//Events verify and register

router.post("/events/register", registerEventPayment);
router.get("/events/verify", verifyEventPayment); 

// Webhooks
router.post("/webhook", handleWebhook);

export default router;
