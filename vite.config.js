import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5000,
    allowedHosts: true,

    watch: {
      usePolling: true,
      interval: 300,
    },

    proxy: {
      "/api": {
        // development backend is now running on port 8001 to avoid conflicts
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});