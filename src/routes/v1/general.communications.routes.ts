import express from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

import {
    sendGeneralBulkEmail,
    getGeneralCommunicationHistory,
    getMemberCount
} from "../../controllers/general.communications.controller";

const router = express.Router();

// General communication routes
router.post("/send-bulk-email", protect, authorizeRoles("admin"), sendGeneralBulkEmail);
router.get("/history", protect, authorizeRoles("admin"), getGeneralCommunicationHistory);
router.get("/member-count", protect, authorizeRoles("admin"), getMemberCount);

export default router;
