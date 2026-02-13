import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest: manifest as any,
      contentScripts: {
        injectCss: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        //    sandbox: 'src/sandbox.html', // Reverted
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || '';

          // Map source files to output names
          if (facadeModuleId.includes('content/script')) return 'content.js';
          if (facadeModuleId.includes('service-worker')) return 'background.js';
          if (facadeModuleId.includes('injector')) return 'injector.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
