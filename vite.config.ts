import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [
    tanstackStart(),
    devtools(),
    nitro({
      plugins: ['server/plugins/migrations.ts'],
      output: {
        dir: 'dist',
      },
      // Externalize packages with ESM bundling issues
      rollupConfig: {
        external: ['ioredis', 'bullmq'],
      },
    }),
    tailwindcss(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    viteReact(),
  ],
})
