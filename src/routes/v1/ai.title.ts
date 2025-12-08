import express from "express";
import { suggestTitle } from "../../controllers/ai.title.controller";
const router = express.Router();

router.post("/suggest-title", suggestTitle);

export default router;
