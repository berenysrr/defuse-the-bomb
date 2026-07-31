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
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-v${Date.now()}.js`,
        chunkFileNames: `assets/[name]-v${Date.now()}.js`,
        assetFileNames: `assets/[name]-v${Date.now()}[extname]`
      }
    }
  },
  server: {
    host: true,
    port: 3000
  }
})
