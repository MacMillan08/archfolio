import "../config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Boştaki bağlantı koptuğunda (Neon uyku/yeniden başlatma) süreç çökmesin
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error("Veritabanı havuzu hatası:", error.message);
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

export const checkDatabase = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Veritabanına bağlanılamadı:", error instanceof Error ? error.message : error);
    return false;
  }
};

export default prisma;
