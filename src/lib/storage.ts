import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { isProduction } from "../config";

const localDir = path.join(__dirname, "../../public/uploads");
const localPrefix = "/uploads/";
const cloudFolder = "archfolio";

const cloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
};

export const isCloudStorageConfigured = (): boolean => cloudinaryConfig() !== null;

const sign = (params: Record<string, string>, apiSecret: string): string => {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + apiSecret).digest("hex");
};

// Yüklenen dosyayı kalıcı depolamaya yazar ve veritabanına kaydedilecek URL'yi döndürür
export const saveImage = async (file: Express.Multer.File): Promise<string> => {
  const cloud = cloudinaryConfig();

  if (cloud) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signed = { folder: cloudFolder, timestamp };

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    form.append("folder", cloudFolder);
    form.append("timestamp", timestamp);
    form.append("api_key", cloud.apiKey);
    form.append("signature", sign(signed, cloud.apiSecret));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    const result = (await response.json()) as { secure_url?: string; error?: { message?: string } };

    if (!response.ok || !result.secure_url) {
      throw new Error(`Cloudinary yükleme hatası: ${result.error?.message ?? response.status}`);
    }
    return result.secure_url;
  }

  if (isProduction) {
    throw new Error("Production ortamında Cloudinary yapılandırılmamış (CLOUDINARY_* değişkenleri eksik).");
  }

  // Geliştirme ortamı: yerel dosya sistemi
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `${suffix}${path.extname(file.originalname).toLowerCase()}`;
  await fs.promises.writeFile(path.join(localDir, filename), file.buffer);
  return `${localPrefix}${filename}`;
};

// Daha önce kaydedilmiş görseli siler; hata olursa isteği düşürmez
export const deleteImage = async (imageUrl: string | null | undefined): Promise<void> => {
  if (!imageUrl) return;

  try {
    if (imageUrl.startsWith(localPrefix)) {
      await fs.promises.rm(path.join(localDir, path.basename(imageUrl)), { force: true });
      return;
    }

    const cloud = cloudinaryConfig();
    const match = imageUrl.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
    if (!cloud || !match?.[1]) return;

    const publicId = decodeURIComponent(match[1]);
    const timestamp = String(Math.floor(Date.now() / 1000));

    const form = new URLSearchParams({
      public_id: publicId,
      timestamp,
      api_key: cloud.apiKey,
      signature: sign({ public_id: publicId, timestamp }, cloud.apiSecret),
    });

    await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/destroy`, {
      method: "POST",
      body: form,
    });
  } catch (error) {
    console.error("Görsel silinemedi:", error);
  }
};
