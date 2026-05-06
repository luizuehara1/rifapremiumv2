import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { MercadoPagoConfig, Payment } from 'mercadopago';

import axios from 'axios';
import { adminDb } from './lib/firebase-admin';

import createPixHandler from './api/create-pix';
import webhookHandler from './api/webhook';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mercado Pago Config
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  // API Routes
  app.post('/api/create-pix', async (req, res) => {
    // @ts-ignore
    return createPixHandler(req, res);
  });

  app.post('/api/webhook', async (req, res) => {
    // @ts-ignore
    return webhookHandler(req, res);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
