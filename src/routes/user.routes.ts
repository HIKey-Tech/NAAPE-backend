import express from "express";
import { getProfile, getAllUsers } from "../controllers/user.controller";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = express.Router();

//any authenticated user
router.get("/profile", protect, getProfile)

//admin-only list of all users
router.get("/", protect, authorizeRoles("admin"), getAllUsers);

export default router;