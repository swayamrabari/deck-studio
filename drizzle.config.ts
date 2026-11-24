import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Supabase transaction pooler string, from .env.local.
    url: process.env.DATABASE_URL!,
  },
});
