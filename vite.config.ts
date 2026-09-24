import { defineConfig } from 'vite'

export default defineConfig({
  root: 'dev/client',
  build: {
    outDir: '../../dist-client',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: { port: 5173 },
})
