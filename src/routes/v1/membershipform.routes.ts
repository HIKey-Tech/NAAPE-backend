import { Router } from "express";
import {
    createMembershipForm,
    getAllMembershipForms,
    getMembershipFormById,
    updateMembershipForm,
    deleteMembershipForm
} from "../../controllers/membershipForm.controller";

const router = Router();

// Create a new membership form
router.post("/", createMembershipForm);

// Get all membership forms
router.get("/", getAllMembershipForms);

// Get a single membership form by ID
router.get("/:id", getMembershipFormById);

// Update a membership form by ID
router.put("/:id", updateMembershipForm);

// Delete a membership form by ID
router.delete("/:id", deleteMembershipForm);

export default router;
