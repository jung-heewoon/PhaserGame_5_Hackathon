import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {devvit} from '@devvit/start/vite'
import {defineConfig} from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const twopointfiveSrc = path.resolve(
  __dirname,
  'node_modules/twopointfive-phaser-3/src',
)

export default defineConfig({
  build: {
    sourcemap: false,
  },
  plugins: [
    devvit({
      client: {
        build: {
          chunkSizeWarningLimit: 3000,
          sourcemap: false,
          minify: false,
          rollupOptions: {
            maxParallelFileOps: 2,
          },
        },
      },
      server: {
        build: {
          minify: false,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@game': path.resolve(__dirname, 'src/client/game'),
      '~': twopointfiveSrc,
    },
  },
  optimizeDeps: {
    exclude: ['twopointfive-phaser-3'],
  },
})
