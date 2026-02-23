import express from "express";
import { uploadGalleryImage, getGalleryImages, deleteGalleryImage } from "../controllers/gallery.controller";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { upload } from "../config/multer";

const router = express.Router();

// Public route
router.get("/", getGalleryImages);

// Admin routes
router.post("/", protect, authorizeRoles("admin", "editor"), upload.array("images", 20), uploadGalleryImage);
router.delete("/:id", protect, authorizeRoles("admin", "editor"), deleteGalleryImage);

export default router;
