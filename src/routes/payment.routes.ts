import express from "express";
import { createPayment } from "../controllers/payment.controller";
import { verifyPayment } from "../controllers/verify.controller";

const router = express.Router();

router.post("/create", createPayment);
router.get("/verify", verifyPayment);

export default router;
