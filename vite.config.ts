import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'vercel-api-simulation',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              const url = new URL(req.url, `http://${req.headers.host}`);
              const pathname = url.pathname;
              
              try {
                // Map /api/xxx to ./api/xxx.ts
                const handlerPath = path.resolve(process.cwd(), `.${pathname}.ts`);
                const { default: handler } = await server.ssrLoadModule(handlerPath);
                
                // Polyfill status/json/send for compatibility with Vercel handlers
                const vercelRes = res as any;
                vercelRes.status = (code: number) => {
                  res.statusCode = code;
                  return vercelRes;
                };
                vercelRes.json = (data: any) => {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return vercelRes;
                };
                vercelRes.send = (data: any) => {
                  res.end(data);
                  return vercelRes;
                };

                // Support parsing JSON body for convenience
                if (req.method === 'POST') {
                  let body = '';
                  req.on('data', chunk => { body += chunk.toString(); });
                  req.on('end', async () => {
                    const vercelReq = req as any;
                    try { vercelReq.body = JSON.parse(body); } catch (e) { vercelReq.body = body; }
                    vercelReq.query = Object.fromEntries(url.searchParams);
                    await handler(vercelReq, vercelRes);
                  });
                } else {
                  const vercelReq = req as any;
                  vercelReq.query = Object.fromEntries(url.searchParams);
                  await handler(vercelReq, vercelRes);
                }
                return;
              } catch (error) {
                // Not found or error loading, skip
              }
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
