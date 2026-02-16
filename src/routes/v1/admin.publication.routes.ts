import express from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
    getAllPublications,
    getPublicationStats,
    deletePublication,
    updatePublication
} from "../../controllers/admin.publication.controller";

const router = express.Router();

// All routes require admin or editor role
router.use(protect, authorizeRoles("admin", "editor"));

// Get all publications with filters
router.get("/", getAllPublications);

// Get publication statistics
router.get("/stats", getPublicationStats);

// Delete any publication
router.delete("/:id", deletePublication);

// Update any publication
router.patch("/:id", updatePublication);

export default router;
