import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { isProduction } from "../config";

const MIN_PRODUCTION_PASSWORD_LENGTH = 12;

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

const isBlocked = (ip: string): boolean => {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
};

const recordFailure = (ip: string): void => {
  const entry = failures.get(ip);
  if (!entry || entry.resetAt < Date.now()) {
    failures.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
};

// Yönetim paneli için HTTP Basic kimlik doğrulaması (bilgiler .env'den okunur).
// Yalnızca HTTPS üzerinden kullanılmalıdır; server.ts production'da HTTPS'i zorunlu kılar.
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  res.set("Cache-Control", "no-store");

  if (!user || !password || (isProduction && password.length < MIN_PRODUCTION_PASSWORD_LENGTH)) {
    res.status(503).send("Yönetim paneli yapılandırılmamış.");
    return;
  }

  const ip = req.ip ?? "unknown";

  if (isBlocked(ip)) {
    res.status(429).send("Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.");
    return;
  }

  const header = req.headers.authorization ?? "";
  const [scheme, encoded] = header.split(" ");

  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString();
    const separator = decoded.indexOf(":");
    const givenUser = decoded.slice(0, separator);
    const givenPassword = decoded.slice(separator + 1);

    if (separator > -1 && safeEqual(givenUser, user) && safeEqual(givenPassword, password)) {
      failures.delete(ip);
      next();
      return;
    }
    recordFailure(ip);
  }

  res.set("WWW-Authenticate", 'Basic realm="Archfolio Admin"');
  res.status(401).send("Yetkisiz erişim");
};

export default requireAdmin;
