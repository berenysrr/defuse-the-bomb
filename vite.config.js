import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Göreceli yolları destekleyerek tüm sunucularda hatasız çalışmasını sağlar
  plugins: [react()],
  define: {
    global: 'window',
    'process.env': {}
  },
  server: {
    host: true,
    port: 3000
  }
})
