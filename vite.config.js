import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = import.meta.dirname;

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        'content/main-world': resolve(__dirname, 'src/content/main-world.js'),
        'content/injector': resolve(__dirname, 'src/content/injector.js'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        format: 'esm',
      },
    },
    target: 'esnext',
    minify: false, // keep readable for debugging
  },
  plugins: [
    {
      name: 'copy-extension-files',
      closeBundle() {
        // Copy manifest
        copyFileSync('manifest.json', 'dist/manifest.json');

        // Copy popup HTML
        const popupDir = 'dist/popup';
        if (!existsSync(popupDir)) mkdirSync(popupDir, { recursive: true });
        copyFileSync('src/popup/popup.html', 'dist/popup/popup.html');
        copyFileSync('src/popup/popup.css', 'dist/popup/popup.css');

        // Copy icons
        const iconsDir = 'dist/icons';
        if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
        const iconSizes = ['16', '32', '48', '128'];
        iconSizes.forEach(size => {
          const src = `public/icons/icon${size}.png`;
          if (existsSync(src)) {
            copyFileSync(src, `dist/icons/icon${size}.png`);
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  }
});
