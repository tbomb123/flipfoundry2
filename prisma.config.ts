// Prisma 7 Configuration
// Connection URL is managed via environment variables
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DATABASE_URL should be set in environment
    // Format: postgresql://user:password@project.neon.tech/dbname?sslmode=require
    url: process.env.DATABASE_URL,
  },
});
