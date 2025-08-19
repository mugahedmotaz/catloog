import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// Local dev adapter for serverless API without external proxy
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import connectDomainHandler from './api/connect-domain';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_PROXY || env.VITE_API_BASE;

  const localApiPlugin: Plugin = {
    name: 'local-api-connect-domain',
    configureServer(server) {
      server.middlewares.use('/api/connect-domain', async (req, res) => {
        try {
          const chunks: Uint8Array[] = [];
          await new Promise<void>((resolve) => {
            req.on('data', (c: Uint8Array) => chunks.push(c));
            req.on('end', () => resolve());
          });
          const body = Buffer.concat(chunks);
          const origin = `http://localhost:${server.config.server.port || 5173}`;
          const url = origin + (req.url || '/api/connect-domain');
          const method = (req.method || 'GET').toUpperCase();
          const request = new Request(url, {
            method,
            headers: req.headers as any,
            body: method === 'GET' || method === 'HEAD' ? undefined : body,
          });
          const response: Response = await connectDomainHandler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          const ab = await response.arrayBuffer();
          res.end(Buffer.from(ab));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e?.message || 'Internal error' }));
        }
      });
    },
  };

  return {
    // Always include localApiPlugin so it handles /api/connect-domain in dev,
    // even if a proxy (VITE_DEV_API_PROXY/VITE_API_BASE) is configured.
    plugins: [react(), localApiPlugin].filter(Boolean) as Plugin[],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      // Forward /api/* during local dev to deployed serverless functions
      proxy: apiTarget
        ? {
            '/api': {
              target: apiTarget,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
  };
});
