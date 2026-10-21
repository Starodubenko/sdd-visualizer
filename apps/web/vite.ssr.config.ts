import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: 'src/entry-server.tsx',
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'entry-server.cjs',
      },
    },
  },
});
