import multer from "multer";

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

// Dosyalar bellekte tutulur; kalıcı depolamaya lib/storage.ts yazar (PaaS'ta disk geçicidir)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, allowedTypes.includes(file.mimetype));
  },
});

export default upload;
