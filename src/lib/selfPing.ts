import { isProduction } from "../config";

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 dakika
const PING_TIMEOUT_MS = 10_000;

// Bazı ücretsiz hosting planları (ör. Render) uzun süre istek gelmezse servisi
// uyku moduna alır; sonraki istek bu yüzden çok yavaş döner (cold start).
// Bu, servisin kendi /health'ine düzenli aralıklarla istek atarak uyanık
// tutmayı dener. Yalnızca production'da ve SELF_PING_URL tanımlıysa çalışır;
// aksi halde sessizce hiçbir şey yapmaz.
//
// ÖNEMLİ SINIR: sunucu bir kez tamamen uykuya dalarsa kendi kendine uyanamaz
// (uyurken zamanlayıcı da durur) — bu yüzden dışarıdan (UptimeRobot/cron-job.org
// vb.) ayrı bir ping de kurulmalı. Buradaki mekanizma yalnızca "zaten ayakta
// olan sunucuyu uykuya dalmadan önce uyanık tutmaya" yardımcı olur.
export const startSelfPing = (): void => {
  if (!isProduction) return;

  const url = process.env.SELF_PING_URL;
  if (!url) return;

  const ping = (): void => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    fetch(url, { signal: controller.signal })
      .catch((error: unknown) => {
        console.warn("Self-ping başarısız:", error instanceof Error ? error.message : error);
      })
      .finally(() => clearTimeout(timer));
  };

  // unref(): bu zamanlayıcı, düzgün kapanmayı (SIGTERM/SIGINT) asla engellemesin
  setInterval(ping, PING_INTERVAL_MS).unref();
};
