import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';

const __dirname = import.meta.dirname;

/**
 * vite-plugin-web-extension automatically:
 * - Reads manifest.json for entry points
 * - Builds content scripts as self-contained IIFE (no "import" statements)
 * - Builds the service worker as an ESM module
 * - Builds the popup as a regular script
 * - Handles CSS ?inline imports via Vite's transform pipeline
 */

function generateManifest() {
  const manifest = readJsonFile('manifest.json');
  const pkg = readJsonFile('package.json');
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  root: 'src',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    minify: false, // Keep readable for debugging
    target: 'esnext',
  },
  plugins: [
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ['package.json', 'manifest.json'],
      disableAutoIcons: false,
    }),
    // Copy static icons to dist/ after every build
    {
      name: 'copy-icons',
      closeBundle() {
        const srcDir = resolve(__dirname, 'public', 'icons');
        const destDir = resolve(__dirname, 'dist', 'icons');
        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
        readdirSync(srcDir).forEach(file => {
          copyFileSync(resolve(srcDir, file), resolve(destDir, file));
        });
        console.log('[AI Toolbox] Icons copied to dist/icons/');
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
