// src/routes/paymentRoutes.ts
import { Router } from "express";

import { createPayment } from "../controllers/payment.controller";
import { createPlan, createSubscription } from "../controllers/subscription.controller";
import { chargeAndTokenize, createTokenizedCharge } from "../controllers/token.controller";
import { createRecipient, createTransfer } from "../controllers/transfer.controller";
import { handleWebhook } from "../controllers/webhook";
import { registerEventPayment, verifyEventPayment } from "../controllers/event.controller";
import { protect } from "../middleware/auth.middleware";
import { getPaymentHistory } from "../controllers/payment.history.controller";

const router = Router();

// Standard checkout payment link
router.post("/create-link", createPayment);

// Payment plans & subscriptions
router.post("/plans", protect, createPlan);
router.post("/subscription", createSubscription);

// Tokenization
router.post("/tokenize", protect, chargeAndTokenize);
router.post("/token-charges", protect, createTokenizedCharge);

// Payouts / Transfers
router.post("/recipients", protect, createRecipient);
router.post("/transfers", protect, createTransfer);

//Events verify and register

router.post("/events/register", protect, registerEventPayment);
router.get("/events/verify", protect, verifyEventPayment); 

//Payment History
router.get("/history/:userId",protect, getPaymentHistory);


// Webhooks
router.post("/webhook", handleWebhook);

export default router;
