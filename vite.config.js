import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// 번들에 빌드 버전을 박는다(deploy.js가 version.json을 올린 뒤 빌드) — 기기 현황(appClients)에서 옛 번들 구분용
const APP_VERSION = JSON.parse(readFileSync('./public/version.json', 'utf8')).version

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui':      ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/messaging'],
          'vendor-charts':   ['recharts'],
          'vendor-motion':   ['framer-motion'],
        },
      },
    },
  },
})
