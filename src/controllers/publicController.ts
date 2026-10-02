import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export const home = async (_req: Request, res: Response): Promise<void> => {
  const [projects, about] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.about.findFirst(),
  ]);

  const categories = [...new Set(projects.map((project) => project.category))];

  res.render("index", { projects, about, categories });
};

export const cvPage = async (_req: Request, res: Response): Promise<void> => {
  const cv = await prisma.cv.findFirst();
  res.render("cv", { title: "CV", cv });
};

export const projectDetail = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const project = Number.isInteger(id) ? await prisma.project.findUnique({ where: { id } }) : null;

  if (!project) {
    res.status(404).render("404");
    return;
  }

  res.render("project", { project });
};
