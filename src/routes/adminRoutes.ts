import { Router } from "express";
import requireAdmin from "../middlewares/auth";
import upload from "../middlewares/upload";
import {
  aboutForm,
  createProject,
  cvForm,
  dashboard,
  deleteProject,
  editProjectForm,
  newProjectForm,
  removeAboutPhoto,
  saveAbout,
  saveCv,
  updateProject,
} from "../controllers/adminController";

const router = Router();

router.use(requireAdmin);

router.get("/", dashboard);

router.get("/projects/new", newProjectForm);
router.post("/projects", upload.single("image"), createProject);
router.get("/projects/:id/edit", editProjectForm);
router.post("/projects/:id", upload.single("image"), updateProject);
router.post("/projects/:id/delete", deleteProject);

router.get("/about", aboutForm);
router.post("/about", upload.single("profileImage"), saveAbout);
router.delete("/about/photo", removeAboutPhoto);

router.get("/cv", cvForm);
router.post("/cv", upload.single("photo"), saveCv);

export default router;
