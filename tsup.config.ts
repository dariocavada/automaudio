import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/element.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  target: 'es2022',
})
