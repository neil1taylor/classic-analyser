import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

function getGitHash(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function ibmPlexFontsPlugin(): Plugin {
  return {
    name: 'ibm-plex-fonts',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/~@ibm/plex')) {
          const fontPath = req.url.replace('/~@ibm/plex', '/node_modules/@ibm/plex');
          const absolutePath = path.join(process.cwd(), fontPath);

          if (fs.existsSync(absolutePath)) {
            const ext = path.extname(absolutePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.woff2': 'font/woff2',
              '.woff': 'font/woff',
              '.ttf': 'font/ttf',
              '.eot': 'application/vnd.ms-fontobject',
            };

            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            fs.createReadStream(absolutePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ibmPlexFontsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '~@ibm/plex': path.resolve(__dirname, 'node_modules/@ibm/plex'),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          carbon: ['@carbon/react', '@carbon/icons-react'],
          charts: ['recharts', '@carbon/charts', '@carbon/charts-react'],
          tables: ['@tanstack/react-table', '@tanstack/react-virtual'],
          excel: ['exceljs'],
          d3: ['d3-hierarchy', 'd3-interpolate', 'd3-scale', 'd3-shape'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_HASH__: JSON.stringify(getGitHash()),
  },
});
