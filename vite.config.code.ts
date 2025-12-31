import { defineConfig } from 'vite';
import { resolve } from 'path';

// Figma 플러그인 code.ts 빌드 설정
// Figma 플러그인 샌드박스는 ES2015까지만 지원하므로 최신 문법을 변환해야 함
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2015',
    minify: mode === 'production' ? 'esbuild' : false,
    sourcemap: mode === 'development' ? 'inline' : false,
    lib: {
      entry: resolve(__dirname, 'src/code.ts'),
      name: 'code',
      fileName: () => 'code.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
        generatedCode: {
          constBindings: false,
        },
      },
    },
  },
  esbuild: {
    // ES2015로 변환하여 ??, ?. 등 최신 문법을 호환 코드로 변환
    target: 'es2015',
  },
}));
