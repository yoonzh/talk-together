import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [react()],
  server: {
    port: 4000,
    host: '0.0.0.0',
    strictPort: false,
    hmr: {
      port: 4000
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  define: {
    'process.env': {},
    // .env 파일과 Vercel 환경변수 모두 지원
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
    'import.meta.env.VITE_TTS_MODULE': JSON.stringify(env.TTS_MODULE || env.VITE_TTS_MODULE),
    'import.meta.env.VITE_GCP_API_KEY': JSON.stringify(env.GCP_API_KEY || env.VITE_GCP_API_KEY),
    // Turso Database 환경변수 추가
    'import.meta.env.VITE_TURSO_DATABASE_URL': JSON.stringify(env.TURSO_DATABASE_URL || env.VITE_TURSO_DATABASE_URL),
    'import.meta.env.VITE_TURSO_AUTH_TOKEN': JSON.stringify(env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN)
  }
}
})