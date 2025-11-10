import express from "express";
import { createPublication, getApprovedPublications, approvedPublication, rejectPublication, getMyPublications } from "../controllers/publication.controller";
import { protect } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import upload from "../config/multer";


const router = express.Router();

//Public route
router.get("/", getApprovedPublications);

//Protected route for logged-in users
router.get(
    "/my",
    protect,
    authorizeRoles("member", "editor", "admin"),
    getMyPublications
)
//Protected (Members)
router.post("/",
    protect,
    authorizeRoles("admin", "editor", "member"),
    (res, req, next) => {
        const contentType = req.header["content-type"] || "";
        if (contentType.startsWith("multipart/form-data")) {
            upload.single("image")(req, res, next);

        } else {
            next()
        }
    },
    createPublication,
);

//Protected (Admin/Editor)
router.patch("/:id/approve", protect, authorizeRoles("admin", "editor"), approvedPublication);
router.patch("/:id/reject", protect, authorizeRoles("admin", "editor"), rejectPublication)


export default router;