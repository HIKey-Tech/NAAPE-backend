import express from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

import {
    getEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getCommunicationHistory,
    sendBulkEmail,
    getEventAttendeesForCommunications
} from "../../controllers/communications.controller";

const router = express.Router();

// Email Templates routes
router.get("/email-templates", protect, authorizeRoles("admin"), getEmailTemplates);
router.post("/email-templates", protect, authorizeRoles("admin"), createEmailTemplate);
router.put("/email-templates/:id", protect, authorizeRoles("admin"), updateEmailTemplate);
router.delete("/email-templates/:id", protect, authorizeRoles("admin"), deleteEmailTemplate);

// Communication routes
router.get("/events/:eventId/communications", protect, authorizeRoles("admin"), getCommunicationHistory);
router.post("/events/send-bulk-email", protect, authorizeRoles("admin"), sendBulkEmail);
router.get("/events/:eventId/attendees", protect, authorizeRoles("admin"), getEventAttendeesForCommunications);

export default router;