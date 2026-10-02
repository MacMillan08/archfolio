import { assertProductionEnv, host, isProduction, port, siteUrl } from "./config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import path from "path";
import prisma, { checkDatabase } from "./lib/prisma";
import { startSelfPing } from "./lib/selfPing";
import { forceHttps, sameOriginOnly, securityHeaders } from "./middlewares/security";
import publicRoutes from "./routes/publicRoutes";
import adminRoutes from "./routes/adminRoutes";

assertProductionEnv();

const app = express();

// Render/Railway/Heroku gibi proxy'lerin arkasında gerçek istemci IP'si ve https bilgisi için
if (isProduction) app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(securityHeaders);
app.use(forceHttps);

app.get("/healthz", async (_req: Request, res: Response) => {
  const ok = await checkDatabase();
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "database_unavailable" });
});

// Hafif sağlık kontrolü: veritabanına veya başka bir ağır işleme dokunmaz,
// yalnızca sunucunun ayakta olduğunu doğrular. Self-ping ve dış uptime
// servisleri (UptimeRobot/cron-job.org) için — /healthz'in aksine DB'yi
// uyandırmadan/yormadan hızlı cevap verir.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Open Graph/Twitter etiketleri için her görünümde mutlak site adresi ve geçerli yol
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.siteUrl = siteUrl;
  res.locals.canonicalUrl = `${siteUrl}${req.originalUrl}`;
  next();
});

// /admin, statik dosyalardan önce bağlanır; hiçbir statik dosya bu rotayı gölgeleyemez
app.use("/admin", sameOriginOnly, adminRoutes);

app.use(express.static(path.join(__dirname, "../public"), { maxAge: isProduction ? "1d" : 0 }));
app.use("/", publicRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).render("404");
});

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).send(err.code === "LIMIT_FILE_SIZE" ? "Dosya 10 MB sınırını aşıyor." : "Dosya yükleme hatası.");
    return;
  }
  console.error(err);
  res.status(500).send("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
});

const server = app.listen(port, host, () => {
  console.log(`Sunucu ${host}:${port} üzerinde çalışıyor`);
  void checkDatabase().then((ok) => {
    if (!ok) console.warn("Uyarı: veritabanına şu an bağlanılamıyor; uygulama çalışmaya devam ediyor.");
  });
  startSelfPing();
});

const shutdown = (): void => {
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (reason) => console.error("Yakalanmayan hata:", reason));
