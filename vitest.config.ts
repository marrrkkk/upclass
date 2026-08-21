import path from "node:path"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// CI hosts such as Vercel preset NODE_ENV=production for the whole build, which
// makes vitest resolve React's production bundles (no React.act) and shims Node
// builtins as browser externals. Tests must always run with NODE_ENV=test.
Object.assign(process.env, { NODE_ENV: "test" })

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    css: false,
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/tests": path.resolve(__dirname, "./tests"),
    },
  },
})
