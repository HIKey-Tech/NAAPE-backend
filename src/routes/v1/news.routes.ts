import { Router } from "express";
import { createNews, getAllNews, getSingleNews } from "../../controllers/news.controller";
import { addNewsComment, getNewsComments, deleteComment } from "../../controllers/comment.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

const router = Router();

// Admin can create news
router.post("/", protect, authorizeRoles("admin", "editor"), createNews);

// Public
router.get("/", getAllNews);
router.get("/:id", getSingleNews);

// Comments on news (all authenticated members can comment)
router.post("/:newsId/comments", protect, addNewsComment);
router.get("/:newsId/comments", protect, getNewsComments);
router.delete("/comments/:commentId", protect, deleteComment);

export default router;
