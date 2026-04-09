import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
<<<<<<< HEAD
    host: true,
  
    watch: {
      usePolling: true,
      interval: 300,
    },

=======
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
>>>>>>> hemanth
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
