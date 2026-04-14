import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  adminBootstrapKey: process.env.ADMIN_BOOTSTRAP_KEY ?? "setup-super-admin",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  aiProvider: process.env.AI_PROVIDER ?? "grok",
  aiApiKey: process.env.AI_API_KEY ?? "",
};
