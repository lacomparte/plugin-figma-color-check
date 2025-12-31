import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Figma 플러그인 ui.html 빌드 설정 (React)
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    viteSingleFile(),
  ],
  root: resolve(__dirname, 'src'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/ui/components'),
      '@/hooks': resolve(__dirname, 'src/ui/hooks'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    target: 'es2020',
    minify: mode === 'production',
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/ui.html'),
      output: {
        assetFileNames: '[name].[ext]',
      },
    },
  },
}));
