import { PrismaClient } from "../generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

console.log("Initializing Prisma with DATABASE_URL:", dbUrl);

export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  adapter: new PrismaBetterSqlite3({
    url: dbUrl,
  }),
});

console.log("Prisma client initialized successfully");
