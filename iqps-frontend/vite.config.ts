import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import copy from 'rollup-plugin-copy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine the correct worker source path based on the mode
  const pdfWorkerSrc = mode === 'development' ? '/src/utils/pdf.worker.min.mjs' : '/pdf.worker.min.mjs';

  return {
    plugins: [
      react(),
      copy({
        targets: [
          { src: 'src/utils/pdf.worker.min.mjs', dest: 'dist' },
          { src: 'src/utils/pdf.worker.min.mjs', dest: 'public' }
        ]
      })
    ],
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    },
    define: {
      'import.meta.env.VITE_PDF_WORKER_SRC': JSON.stringify(pdfWorkerSrc)
    }
  }
})
