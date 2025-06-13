import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  define: {
    __DEV__: 'true',
    __TEST__: 'true'
  },
  root: __dirname,
  resolve: {
    alias: {
      'vanjs-reactive-element': path.resolve(__dirname, '../src/index.ts'),
      '@': path.resolve(__dirname, '../')
    }
  },
  server: {
    port: 5556,
    open: true
  }
});
