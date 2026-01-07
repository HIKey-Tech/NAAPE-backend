// src/routes/paymentRoutes.ts
import { Router } from "express";

import { createPayment } from "../../controllers/payment.controller";
import { createPlan,  initializeSubscriptionPayment } from "../../controllers/subscription.controller";
import { chargeAndTokenize, createTokenizedCharge } from "../../controllers/token.controller";
import { createRecipient, createTransfer } from "../../controllers/transfer.controller";
import { handleWebhook } from "../../controllers/webhook";
import { getEventPaymentStatus, registerEventPayment, verifyEventPayment } from "../../controllers/event.controller";
import { protect } from "../../middleware/auth.middleware";
import { getPaymentHistory } from "../../controllers/payment.history.controller";

const router = Router();

// Standard checkout payment link
router.post("/create-link", createPayment);

// Payment plans & subscriptions
router.post("/plans",  createPlan);
// router.post("/subscription", protect, createSubscription);
router.post(
    "/subscription/initialize-payment",
    protect,
    initializeSubscriptionPayment
);

// Tokenization
router.post("/tokenize", chargeAndTokenize);
router.post("/token-charges", createTokenizedCharge);

// Payouts / Transfers
router.post("/recipients", createRecipient);
router.post("/transfers", createTransfer);

//Events verify and register

router.post("/events/register",  registerEventPayment);
router.get("/events/verify",  verifyEventPayment);

//Payment History
router.get("/history/:userId", protect, getPaymentHistory);
// New route
router.get("/events/status", getEventPaymentStatus);



// Webhooks
router.post("/webhook", handleWebhook);

export default router;
