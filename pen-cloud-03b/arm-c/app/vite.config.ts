import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 4304, strictPort: true, host: "127.0.0.1" },
  preview: { port: 4304, strictPort: true, host: "127.0.0.1" },
  build: { target: "es2022", sourcemap: false },
});
