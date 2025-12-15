import { Router } from "express";
import { createSubscriptionPlan } from "../../controllers/subscription.controller";

const router = Router();

router.post("/", createSubscriptionPlan);

export default router;
