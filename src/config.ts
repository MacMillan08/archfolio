import dotenv from "dotenv";

// Ortam değişkenlerini diğer modüllerden önce yükler; modüller bu dosyayı import eder
dotenv.config();

export const isProduction = process.env.NODE_ENV === "production";

export const port = Number(process.env.PORT) || 3000;
export const host = process.env.HOST || "0.0.0.0";

// Open Graph/Twitter etiketlerinde mutlak URL üretmek için; sondaki "/" temizlenir
export const siteUrl = (process.env.SITE_URL || `http://localhost:${port}`).replace(/\/+$/, "");

// Production'da zorunlu değişkenler eksikse başlangıçta net bir hatayla durur
export const assertProductionEnv = (): void => {
  if (!isProduction) return;

  const required = [
    "DATABASE_URL",
    "ADMIN_USER",
    "ADMIN_PASSWORD",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Eksik ortam değişkenleri: ${missing.join(", ")}`);
  }
};
