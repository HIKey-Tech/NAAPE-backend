import express from "express";
import {
    getCategories,
    createCategory,
    getThreadsByCategory,
    getAllThreads,
    getThreadById,
    createThread,
    updateThread,
    deleteThread,
    togglePinThread,
    toggleLockThread,
    getRepliesByThread,
    createReply,
    updateReply,
    deleteReply,
} from "../controllers/forum.controller";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = express.Router();

// ============ CATEGORIES ============
router.get("/categories", getCategories);
router.post("/categories", protect, authorizeRoles("admin"), createCategory);

// ============ THREADS ============
router.get("/threads", getAllThreads);
router.get("/threads/category/:categoryId", getThreadsByCategory);
router.get("/threads/:threadId", getThreadById);
router.post("/threads", protect, createThread);
router.put("/threads/:threadId", protect, updateThread);
router.delete("/threads/:threadId", protect, deleteThread);
router.patch("/threads/:threadId/pin", protect, authorizeRoles("admin"), togglePinThread);
router.patch("/threads/:threadId/lock", protect, authorizeRoles("admin"), toggleLockThread);

// ============ REPLIES ============
router.get("/threads/:threadId/replies", getRepliesByThread);
router.post("/threads/:threadId/replies", protect, createReply);
router.put("/replies/:replyId", protect, updateReply);
router.delete("/replies/:replyId", protect, deleteReply);

export default router;
