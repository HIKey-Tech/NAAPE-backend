import express from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

import {
    createEvent,
    getAllEvents,
    getSingleEvent,
    getUserEvents,
    getEventAttendees,
    updateAttendeeAttendance,
    exportEventAttendees,
    updateEvent,
    deleteEvent,
    updateEventStatus,
    getEventSettings,
    updateEventSettings,
    getAdminEvents,
} from "../../controllers/event.controller";
import { getEventsForAttendeeManagement } from "../../controllers/payment.history.controller";
import { upload } from "../../config/multer";

const router = express.Router();

// Public routes
router.get("/", getAllEvents);
router.get("/:id", getSingleEvent);

// Authenticated user routes
router.get("/my-events", protect, getUserEvents);

// Admin-only event management routes
router.get("/admin/events", protect, authorizeRoles("admin"), getAdminEvents);
router.post("/", protect, authorizeRoles("admin"), upload.single("image"), createEvent);
router.put("/:eventId", protect, authorizeRoles("admin"), upload.single("image"), updateEvent);
router.delete("/:eventId", protect, authorizeRoles("admin"), deleteEvent);
router.patch("/:eventId/status", protect, authorizeRoles("admin"), updateEventStatus);

// Admin event settings routes
router.get("/:eventId/settings", protect, authorizeRoles("admin"), getEventSettings);
router.put("/:eventId/settings", protect, authorizeRoles("admin"), updateEventSettings);

// Admin attendee management routes
router.get("/admin/events-summary", protect, authorizeRoles("admin"), getEventsForAttendeeManagement);
router.get("/:eventId/attendees", protect, authorizeRoles("admin"), getEventAttendees);
router.put("/:eventId/attendees/:userId/attendance", protect, authorizeRoles("admin"), updateAttendeeAttendance);
router.get("/:eventId/attendees/export", protect, authorizeRoles("admin"), exportEventAttendees);

export default router;
