import type { NextFunction, Request, Response } from "express";
import { isProduction } from "../config";

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  if (isProduction) {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

// Production'da HTTP isteklerini HTTPS'e yönlendirir (proxy arkasında x-forwarded-proto ile, /healthz hariç)
export const forceHttps = (req: Request, res: Response, next: NextFunction): void => {
  if (!isProduction || req.secure || req.path === "/healthz") {
    next();
    return;
  }
  res.redirect(308, `https://${req.get("host")}${req.originalUrl}`);
};

// Basic Auth tarayıcıda otomatik gönderildiği için, durum değiştiren isteklerde
// Origin/Referer aynı siteye ait değilse reddeder (CSRF koruması)
export const sameOriginOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const source = req.get("origin") ?? req.get("referer");
  if (source) {
    try {
      if (new URL(source).host !== req.get("host")) {
        res.status(403).send("Geçersiz istek kaynağı");
        return;
      }
    } catch {
      res.status(403).send("Geçersiz istek kaynağı");
      return;
    }
  }
  next();
};
