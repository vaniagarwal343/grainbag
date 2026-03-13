import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/grainbag/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        concept: resolve(__dirname, 'concept.html'),
      },
    },
  },
})
