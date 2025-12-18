import express from "express";
import { getProfileContoller, getAllUsers, updateUserRole, getAllMembers, changePassword, updateProfile } from "../../controllers/user.controller";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { upload } from "../../config/multer";

const router = express.Router();

const getProfilecontroller = new getProfileContoller()
//any authenticated user

router.get("/profile", protect, (req, res) => getProfilecontroller.execute(req, res))
router.patch("/change-password", protect, changePassword)
router.put(
    "/profile",
    protect,
    upload.single("image"),
    updateProfile
);

//admin-only list of all users
router.get("/", protect, authorizeRoles("admin"), getAllUsers);
router.get("/members", protect, authorizeRoles("admin"), getAllMembers);


//ADMIN: Change user role
router.patch("/:id/role", protect, authorizeRoles("admin"), updateUserRole);

export default router;