import express from "express";
import {
    getForumDashboard,
    getForumActivity,
    getAllCategories,
    createCategoryAdmin,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getAllThreadsAdmin,
    pinThread,
    lockThread,
    moveThread,
    deleteThreadAdmin,
    bulkThreadActions,
    getPendingApprovals,
    approveThread,
    rejectThread,
    getAllRepliesAdmin,
    updateReplyAdmin,
    deleteReplyAdmin,
    bulkReplyActions,
    getForumUsers,
    getForumUserMetrics,
    banUser,
    unbanUser,
    getUserForumActivity,
    getAllReports,
    getReportById,
    resolveReport,
    dismissReport,
    bulkReportActions,
    getForumAnalyticsOverview,
    getForumActivityMetrics,
    getUserEngagementMetrics,
    exportForumAnalytics
} from "../../controllers/admin.forum.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

const router = express.Router();

// Apply admin authentication to all routes
router.use(protect);
router.use(authorizeRoles("admin"));

// ============ DASHBOARD ROUTES ============
router.get("/forum/dashboard", getForumDashboard);
router.get("/forum/activity", getForumActivity);

// ============ CATEGORY MANAGEMENT ROUTES ============
router.get("/forum/categories", getAllCategories);
router.post("/forum/categories", createCategoryAdmin);
router.put("/forum/categories/:categoryId", updateCategory);
router.delete("/forum/categories/:categoryId", deleteCategory);
router.patch("/forum/categories/reorder", reorderCategories);

// ============ THREAD MODERATION ROUTES ============
router.get("/forum/threads", getAllThreadsAdmin);
router.patch("/forum/threads/:threadId/pin", pinThread);
router.patch("/forum/threads/:threadId/lock", lockThread);
router.patch("/forum/threads/:threadId/move", moveThread);
router.delete("/forum/threads/:threadId", deleteThreadAdmin);
router.post("/forum/threads/bulk-action", bulkThreadActions);

// Thread approval workflow
router.get("/forum/threads/pending-approvals", getPendingApprovals);
router.post("/forum/threads/:threadId/approve", approveThread);
router.post("/forum/threads/:threadId/reject", rejectThread);

// ============ REPLY MODERATION ROUTES ============
router.get("/forum/replies", getAllRepliesAdmin);
router.put("/forum/replies/:replyId", updateReplyAdmin);
router.delete("/forum/replies/:replyId", deleteReplyAdmin);
router.post("/forum/replies/bulk-action", bulkReplyActions);

// ============ USER MANAGEMENT ROUTES ============
router.get("/forum/users/metrics", getForumUserMetrics);
router.get("/forum/users", getForumUsers);
router.post("/forum/users/:userId/ban", banUser);
router.delete("/forum/users/:userId/ban", unbanUser);
router.get("/forum/users/:userId/activity", getUserForumActivity);

// ============ REPORT MANAGEMENT ROUTES ============
router.get("/forum/reports", getAllReports);
router.get("/forum/reports/:reportId", getReportById);
router.post("/forum/reports/:reportId/resolve", resolveReport);
router.post("/forum/reports/:reportId/dismiss", dismissReport);
router.post("/forum/reports/bulk-action", bulkReportActions);

// ============ ANALYTICS ROUTES ============
router.get("/forum/analytics/overview", getForumAnalyticsOverview);
router.get("/forum/analytics/activity", getForumActivityMetrics);
router.get("/forum/analytics/users", getUserEngagementMetrics);
router.get("/forum/analytics/export", exportForumAnalytics);

export default router;