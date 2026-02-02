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
import { requireSubscription } from "../../middleware/require.subscription.middleware";

const router = express.Router();

// Public route - anyone can view approved publications
router.get("/", getAllPublications);

// Protected route for logged-in users (fetch all my publications)
router.get(
    "/my",
    protect,
    authorizeRoles("member", "editor", "admin"),
    getMyPublications
);

// Create new publication - REQUIRES ACTIVE SUBSCRIPTION for members
router.post(
    "/",
    protect,
    authorizeRoles("admin", "editor", "member"),
    (req, res, next) => {
        // Admins and editors bypass subscription check
        if (req.user && (req.user.role === "admin" || req.user.role === "editor")) {
            return next();
        }
        // Members need active subscription
        return requireSubscription(req, res, next);
    },
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

// Fetch a specific publication - REQUIRES ACTIVE SUBSCRIPTION for members to view
router.get(
    "/:id",
    protect,
    (req, res, next) => {
        // Admins and editors bypass subscription check
        if (req.user && (req.user.role === "admin" || req.user.role === "editor")) {
            return next();
        }
        // Members need active subscription
        return requireSubscription(req, res, next);
    },
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