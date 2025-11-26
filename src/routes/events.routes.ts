import express from "express";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

import {
    createEvent,
    getAllEvents,
    getSingleEvent,
    registerForEvent,
} from "../controllers/event.controller";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createEvent);
router.get("/", protect, getAllEvents);
router.get("/:id", protect, getSingleEvent);
router.post("/:id/register", protect, registerForEvent);

export default router;
