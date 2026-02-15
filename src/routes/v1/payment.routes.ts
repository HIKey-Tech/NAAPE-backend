// src/routes/paymentRoutes.ts
import { Router } from "express";

import { createPayment } from "../../controllers/payment.controller";
import { createPlan,  initializeSubscriptionPayment, verifySubscriptionPayment, getSubscriptionStatus, debugSubscription } from "../../controllers/subscription.controller";
import { chargeAndTokenize, createTokenizedCharge } from "../../controllers/token.controller";
import { createRecipient, createTransfer } from "../../controllers/transfer.controller";
import { handleWebhook } from "../../controllers/webhook";
import { getEventPaymentStatus, registerEventPayment, verifyEventPayment } from "../../controllers/event.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { getPaymentHistory, getAdminEventPayments, getEventPaymentStats } from "../../controllers/payment.history.controller";

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
router.get(
    "/subscription/verify",
    protect,
    verifySubscriptionPayment
);
router.get(
    "/subscription/status",
    protect,
    getSubscriptionStatus
);

// Tokenization
router.post("/tokenize", chargeAndTokenize);
router.post("/token-charges", createTokenizedCharge);

// Payouts / Transfers
router.post("/recipients", createRecipient);
router.post("/transfers", createTransfer);

//Events verify and register (authenticated users only)
router.post("/events/register", protect, registerEventPayment);
router.get("/events/verify", verifyEventPayment);

//Payment History
router.get("/history/:userId", protect, getPaymentHistory);

//Event payment status (authenticated users only)
router.get("/events/status", protect, getEventPaymentStatus);

// Admin routes for event payment oversight
router.get("/admin/events/payments", protect, authorizeRoles("admin"), getAdminEventPayments);
router.get("/admin/events/stats", protect, authorizeRoles("admin"), getEventPaymentStats);

// Debug subscription endpoint
router.get("/subscription/debug", protect, debugSubscription);



// Webhooks
router.post("/webhook", handleWebhook);

export default router;
