import express from "express";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

import {
    createEvent,
    getAllEvents,
    getSingleEvent,
    registerEventPayment,
    registerForEvent,
} from "../controllers/event.controller";
import { upload } from "../config/multer";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), upload.single("image"), createEvent);
router.get("/", protect, getAllEvents);
router.get("/:id", protect, getSingleEvent);
router.post("/:id/register", protect, registerForEvent);
router.post("/:id/pay", protect, registerEventPayment);
router.post("/webhook/flutterwave", handleFlutterwaveWebhook); // webhook

export default router;
