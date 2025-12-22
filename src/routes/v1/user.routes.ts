import express from "express";
import { getProfile, getAllUsers, updateUserRole, getAllMembers, changePassword, updateProfile } from "../../controllers/user.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { upload, uploadProfileImage } from "../../config/multer";

const router = express.Router();

//any authenticated user
router.get("/profile", protect, getProfile)
router.patch("/change-password", protect, changePassword)
router.put(
    "/profile",
    protect,
    // uploadProfileImage.single("image"),
    upload.single("image"),
    updateProfile
);

//admin-only list of all users
router.get("/", protect, authorizeRoles("admin"), getAllUsers);
router.get("/members", protect, authorizeRoles("admin"), getAllMembers);


//ADMIN: Change user role
router.patch("/:id/role", protect, authorizeRoles("admin"), updateUserRole);

export default router;