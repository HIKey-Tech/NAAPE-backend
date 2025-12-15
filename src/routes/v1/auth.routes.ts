import express from "express";
import { registerUser, loginUser } from "../../controllers/auth.controller";
import { forgotPassword } from "../../controllers/reset.password.controller";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
// router.post("/google", googleAuth);

//forgot password

router.post("/forgot-password", forgotPassword);

export default router;