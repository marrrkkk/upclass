import path from "node:path"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/tests": path.resolve(__dirname, "./tests"),
    },
  },
})
