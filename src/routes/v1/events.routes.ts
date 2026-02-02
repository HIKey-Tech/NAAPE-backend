import express from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

import {
    createEvent,
    getAllEvents,
    getSingleEvent,
    getUserEvents,
} from "../../controllers/event.controller";
import { upload } from "../../config/multer";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), upload.single("image"), createEvent);
router.get("/", getAllEvents);
router.get("/my-events", protect, getUserEvents);
router.get("/:id", getSingleEvent);

export default router;
