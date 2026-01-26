import express from "express";
import {
    createPublication,
    approvedPublication,
    rejectPublication,
    getMyPublications,
    getAllPublications,
    getSinglePublication,
    updateMyPublication,
    deleteMyPublication,
} from "../../controllers/publication.controller";
import { optionalProtect, protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { upload } from "../../config/multer";

const router = express.Router();

// Public route
router.get("/", getAllPublications);

// Protected route for logged-in users (fetch all my publications)
router.get(
    "/my",
    protect,
    authorizeRoles("member", "editor", "admin"),
    getMyPublications
);

// Create new publication (Members/Admins/Editors)
router.post(
    "/",
    protect,
    authorizeRoles("admin", "editor", "member"),
    (req, res, next) => {
        const contentType = req.headers["content-type"] || "";
        if (contentType.startsWith("multipart/form-data")) {
            upload.single("image")(req, res, next);
        } else {
            next();
        }
    },
    createPublication
);

// Fetch a specific publication belonging to logged-in user
router.get(
    "/:id",
    // optionalProtect,
    getSinglePublication
);

// Update a specific publication belonging to logged-in user
router.patch(
    "/my/:id",
    protect,
    authorizeRoles("member", "editor", "admin"),
    (req, res, next) => {
        const contentType = req.headers["content-type"] || "";
        if (contentType.startsWith("multipart/form-data")) {
            upload.single("image")(req, res, next);
        } else {
            next();
        }
    },
    updateMyPublication
);

// Delete a specific publication belonging to logged-in user
router.delete(
    "/my/:id",
    protect,
    authorizeRoles("member", "editor", "admin"),
    deleteMyPublication
);

// For Admin/Editor operations (approve/reject)
router.patch("/:id/approve", protect, authorizeRoles("admin", "editor"), approvedPublication);
router.patch("/:id/reject", protect, authorizeRoles("admin", "editor"), rejectPublication);

export default router;