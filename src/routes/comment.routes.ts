import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    addComment,
    getComments,
    deleteComment,
} from "../controllers/comment.controller";

const router = Router();

// Add comment
router.post("/:publicationId", protect, addComment);

// Get comments for one publication
router.get("/:publicationId", protect, getComments);

// Delete comment
router.delete("/delete/:commentId", protect, deleteComment);

export default router;
