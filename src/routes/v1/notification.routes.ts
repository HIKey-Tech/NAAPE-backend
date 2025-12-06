import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../../controllers/notification.controller";

const router = Router();

// Get all notifications of logged-in user
router.get("/", protect, getMyNotifications);

// Mark one as read
router.patch("/:id/read", protect, markAsRead);

// Mark all as read
router.patch("/read-all", protect, markAllAsRead);

// Delete one
router.delete("/:id", protect, deleteNotification);

export default router;
