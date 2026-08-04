import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    // process.cwd(), no __dirname: en un config .ts cargado por Vite,
    // __dirname puede quedar indefinido según cómo se transpile.
    alias: {
      "@": path.resolve(process.cwd()),
    },
  },
})
