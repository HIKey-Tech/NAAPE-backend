import { Router } from "express";
import {
    getAllNewsAdmin,
    getNewsStats,
    updateNews,
    deleteNews,
    getNewsDetails,
    getNewsCommentsAdmin,
    deleteCommentAdmin,
    bulkDeleteNews,
    bulkUpdateStatus
} from "../../controllers/admin.news.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

const router = Router();

// All routes require admin or editor role
router.use(protect, authorizeRoles("admin", "editor"));

// News management
router.get("/", getAllNewsAdmin);
router.get("/stats", getNewsStats);
router.get("/:id", getNewsDetails);
router.put("/:id", updateNews);
router.delete("/:id", deleteNews);

// Bulk operations
router.post("/bulk/delete", bulkDeleteNews);
router.post("/bulk/status", bulkUpdateStatus);

// Comment moderation
router.get("/:newsId/comments", getNewsCommentsAdmin);
router.delete("/comments/:commentId", deleteCommentAdmin);

export default router;
