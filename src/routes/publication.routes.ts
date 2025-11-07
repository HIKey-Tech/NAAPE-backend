import express from "express";
import { createPublication, getApprovedPublications, approvedPublication, rejectPublication } from "../controllers/publication.controller";
import { protect } from "../middleware/auth.middleware";


const router = express.Router();

//Public route
router.get("/", getApprovedPublications);

//Protected (Members)
router.post("/", protect, createPublication);

//Protected (Admin/Editor)
router.patch("/:id/approve", protect, approvedPublication);
router.patch("/:id/reject", protect, rejectPublication)


export default router;