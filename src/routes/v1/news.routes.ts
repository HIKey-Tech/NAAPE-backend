import { Router } from "express";
import { createNews, getAllNews, getSingleNews } from "../../controllers/news.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

const router = Router();

// Admin can create news
router.post("/", protect, authorizeRoles("admin", "editor"), createNews);

// Public
router.get("/", getAllNews);
router.get("/:id", getSingleNews);

export default router;
