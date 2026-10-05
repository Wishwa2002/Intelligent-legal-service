import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig(({ mode }) => ({

  cacheDir: mode === "test" ? "node_modules/.vite-playwright" : "node_modules/.vite",

  plugins: [
    react(),
    tailwindcss()
  ],

}))