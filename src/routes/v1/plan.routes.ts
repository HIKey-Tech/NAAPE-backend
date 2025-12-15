import { Router } from "express";
import { createSubscriptionPlan, getAllPlans } from "../../controllers/subscription.controller";

const router = Router();

router.post("/", createSubscriptionPlan);
router.get("/get-plans", getAllPlans);

export default router;
