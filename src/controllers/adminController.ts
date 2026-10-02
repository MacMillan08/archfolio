import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { deleteImage, saveImage } from "../lib/storage";

const parseId = (req: Request): number => Number(req.params.id);

export const dashboard = async (_req: Request, res: Response): Promise<void> => {
  const [projects, about, cv] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.about.findFirst(),
    prisma.cv.findFirst(),
  ]);
  res.render("admin/dashboard", { projects, about, cv });
};

export const newProjectForm = (_req: Request, res: Response): void => {
  res.render("admin/project-form", { project: null, error: null });
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  const { title, category, description } = req.body as Record<string, string | undefined>;

  if (!title?.trim() || !category?.trim() || !description?.trim() || !req.file) {
    res.status(400).render("admin/project-form", {
      project: { title, category, description },
      error: "Başlık, kategori, açıklama ve geçerli bir fotoğraf (JPG, PNG, WebP, GIF, AVIF) zorunludur.",
    });
    return;
  }

  const imageUrl = await saveImage(req.file);

  await prisma.project.create({
    data: {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      imageUrl,
    },
  });

  res.redirect("/admin");
};

export const editProjectForm = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req);
  const project = Number.isInteger(id) ? await prisma.project.findUnique({ where: { id } }) : null;

  if (!project) {
    res.status(404).render("404");
    return;
  }

  res.render("admin/project-form", { project, error: null });
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req);
  const existing = Number.isInteger(id) ? await prisma.project.findUnique({ where: { id } }) : null;

  if (!existing) {
    res.status(404).render("404");
    return;
  }

  const { title, category, description } = req.body as Record<string, string | undefined>;

  if (!title?.trim() || !category?.trim() || !description?.trim()) {
    res.status(400).render("admin/project-form", {
      project: { ...existing, title, category, description },
      error: "Başlık, kategori ve açıklama zorunludur.",
    });
    return;
  }

  const imageUrl = req.file ? await saveImage(req.file) : undefined;

  await prisma.project.update({
    where: { id },
    data: {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  if (imageUrl) await deleteImage(existing.imageUrl);

  res.redirect("/admin");
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req);
  const existing = Number.isInteger(id) ? await prisma.project.findUnique({ where: { id } }) : null;

  if (existing) {
    await prisma.project.delete({ where: { id } });
    await deleteImage(existing.imageUrl);
  }

  res.redirect("/admin");
};

export const aboutForm = async (_req: Request, res: Response): Promise<void> => {
  const about = await prisma.about.findFirst();
  res.render("admin/about-form", { about, error: null });
};

export const saveAbout = async (req: Request, res: Response): Promise<void> => {
  const { bio } = req.body as Record<string, string | undefined>;
  const existing = await prisma.about.findFirst();

  // Biyografi isteğe bağlı: boş gönderilirse gerçekten boş olarak kaydedilir
  // (alan koşullu değil, her zaman data'da yer alır — eski metin geri gelmez).
  const bioValue = (bio ?? "").trim();
  const profileImage = req.file ? await saveImage(req.file) : undefined;

  if (existing) {
    await prisma.about.update({
      where: { id: existing.id },
      data: { bio: bioValue, ...(profileImage ? { profileImage } : {}) },
    });
    if (profileImage) await deleteImage(existing.profileImage);
  } else {
    await prisma.about.create({ data: { bio: bioValue, profileImage: profileImage ?? null } });
  }

  res.redirect("/admin");
};

// Diğer alanlardan (bio vb.) tamamen bağımsız: sadece fotoğrafı siler.
// Sayfa yenilenmeden fetch() ile çağrılır, bu yüzden JSON döner (redirect değil).
export const removeAboutPhoto = async (_req: Request, res: Response): Promise<void> => {
  const existing = await prisma.about.findFirst();

  if (existing?.profileImage) {
    await prisma.about.update({ where: { id: existing.id }, data: { profileImage: null } });
    await deleteImage(existing.profileImage);
  }

  res.json({ ok: true });
};

export const cvForm = async (_req: Request, res: Response): Promise<void> => {
  const cv = await prisma.cv.findFirst();
  res.render("admin/cv-edit", { cv, error: null });
};

export const saveCv = async (req: Request, res: Response): Promise<void> => {
  const { name, title, bio, email, phone, location } = req.body as Record<string, string | undefined>;
  const existing = await prisma.cv.findFirst();

  if (!name?.trim() || !title?.trim() || !bio?.trim()) {
    // req.file bellekte tutulur (multer memoryStorage); saveImage hiç çağrılmadığı için
    // kalıcı depolamaya bir şey yazılmadı, temizlenecek bir şey yok.
    res.status(400).render("admin/cv-edit", {
      cv: { ...existing, name, title, bio, email, phone, location },
      error: "Ad, ünvan ve özet alanları zorunludur.",
    });
    return;
  }

  const photoUrl = req.file ? await saveImage(req.file) : undefined;

  const data = {
    name: name.trim(),
    title: title.trim(),
    bio: bio.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    location: location?.trim() || null,
    ...(photoUrl ? { photoUrl } : {}),
  };

  if (existing) {
    await prisma.cv.update({ where: { id: existing.id }, data });
    if (photoUrl) await deleteImage(existing.photoUrl);
  } else {
    await prisma.cv.create({ data: { ...data, photoUrl: photoUrl ?? null } });
  }

  res.redirect("/admin");
};
