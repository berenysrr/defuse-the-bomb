import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Yerel ağdaki (Wi-Fi) tüm cihazların erişimine açar
    port: 3000  // Portu 3000 yapar
  }
})
