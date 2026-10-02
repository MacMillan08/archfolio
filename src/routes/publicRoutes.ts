import { Router } from "express";
import { cvPage, home, projectDetail } from "../controllers/publicController";

const router = Router();

router.get("/", home);
router.get("/cv", cvPage);
router.get("/projects/:id", projectDetail);

export default router;
