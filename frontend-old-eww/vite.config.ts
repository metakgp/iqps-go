import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import copy from 'rollup-plugin-copy';

export default defineConfig(({ mode }) => {
  // Determine the correct worker source path based on the mode
  const pdfWorkerSrc = mode === 'development' ? '/src/utils/pdf.worker.min.mjs' : '/pdf.worker.min.mjs';

  return {
    plugins: [
      /* 
      Uncomment the following line to enable solid-devtools.
      For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
      */
      // devtools(),
      solidPlugin(),
      copy({
        targets: [
          { src: 'src/utils/pdf.worker.min.mjs', dest: 'dist' },
          { src: 'src/utils/pdf.worker.min.mjs', dest: 'public' }
        ]
      })
    ],
    server: {
      port: 3000,
    },
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
  };
});
