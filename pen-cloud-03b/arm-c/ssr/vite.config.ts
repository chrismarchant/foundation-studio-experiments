import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const generated = fileURLToPath(new URL("../app/src/generated", import.meta.url));

export default defineConfig({
  server: { port: 4305, strictPort: true, host: "127.0.0.1", fs: { allow: [".."] } },
  resolve: {
    alias: { "@generated": generated },
    dedupe: ["react", "react-dom", "motion"],
  },
  plugins: [tanstackStart(), viteReact()],
});
