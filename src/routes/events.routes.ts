import express from "express";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { createEvent, getAllEvents } from "../controllers/event.controller";

const router = express.Router();

// ADMIN CREATE EVENT
router.post("/", protect, authorizeRoles("admin"), createEvent);

// ALL USERS CAN SEE EVENTS
router.get("/", protect, getAllEvents);

export default router;
