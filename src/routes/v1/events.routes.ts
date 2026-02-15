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

// Admin-only event management routes (put these FIRST to avoid conflicts)
router.get("/admin/events", protect, authorizeRoles("admin"), getAdminEvents);
router.get("/admin/events-summary", protect, authorizeRoles("admin"), getEventsForAttendeeManagement);

// Public routes
router.get("/", getAllEvents);

// Authenticated user routes
router.get("/my-events", protect, getUserEvents);

// Admin attendee management routes
router.get("/:eventId/attendees", protect, authorizeRoles("admin"), getEventAttendees);
router.put("/:eventId/attendees/:userId/attendance", protect, authorizeRoles("admin"), updateAttendeeAttendance);
router.get("/:eventId/attendees/export", protect, authorizeRoles("admin"), exportEventAttendees);

// Admin event settings routes
router.get("/:eventId/settings", protect, authorizeRoles("admin"), getEventSettings);
router.put("/:eventId/settings", protect, authorizeRoles("admin"), updateEventSettings);

// Admin event CRUD routes
router.post("/", protect, authorizeRoles("admin"), upload.single("image"), createEvent);
router.put("/:eventId", protect, authorizeRoles("admin"), upload.single("image"), updateEvent);
router.delete("/:eventId", protect, authorizeRoles("admin"), deleteEvent);
router.patch("/:eventId/status", protect, authorizeRoles("admin"), updateEventStatus);

// Public single event route (put this LAST to avoid conflicts with admin routes)
router.get("/:id", getSingleEvent);

export default router;
