import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/public_lumber/adventure_book/",
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [".ngrok-free.dev"],
  },
});
