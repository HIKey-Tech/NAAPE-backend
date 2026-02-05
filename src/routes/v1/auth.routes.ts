import express from "express";
import { registerUser, loginUser } from "../../controllers/auth.controller";
import { forgotPassword, resetPassword } from "../../controllers/reset.password.controller";
import { googleAuth } from "../../controllers/google.auth.controller";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);

//forgot password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;