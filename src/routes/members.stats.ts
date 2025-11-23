import express from "express";
import { protect } from "../middleware/auth.middleware";
import { getMemberDashboardStats } from "../controllers/members.stats";

const router = express.Router();

router.get("/", protect, getMemberDashboardStats);

export default router;
