import express from "express";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

import {
    createEvent,
    getAllEvents,
    getSingleEvent,
    registerEventPayment,
} from "../controllers/event.controller";
import { upload } from "../config/multer";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), upload.single("image"), createEvent);
router.get("/", protect, getAllEvents);
router.get("/:id", protect, getSingleEvent);
router.post("/:id/pay", protect, registerEventPayment);

export default router;
