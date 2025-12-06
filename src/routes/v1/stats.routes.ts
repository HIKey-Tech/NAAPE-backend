import express from "express";
import { getAdminStats } from "../../controllers/stats.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

const router = express.Router();

router.get(
    "/",
    protect,
    authorizeRoles("admin", "editor"), // only admin/editor
    getAdminStats
);

export default router;
