import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { MercadoPagoConfig, Payment } from 'mercadopago';

import { adminDb } from './lib/firebase-admin';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mercado Pago Config
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  });

  const payment = new Payment(client);

  // API Routes
  app.post('/api/create-pix', async (req, res) => {
    try {
      const { amount, description, payer, external_reference } = req.body;

      const body = {
        transaction_amount: amount,
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: payer.email,
          first_name: payer.first_name,
          identification: {
            type: 'CPF',
            number: payer.identification.number
          }
        },
        external_reference: external_reference,
        notification_url: `${process.env.APP_URL}/api/webhook`,
      };

      const result = await payment.create({ body });
      
      res.json({
        id: result.id,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
      });
    } catch (error: any) {
      console.error('Error creating PIX:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/webhook', async (req, res) => {
    try {
      const { type, data, action } = req.body;

      // Handle both formats of Mercado Pago notifications
      const paymentId = (type === 'payment' && data?.id) || (action === 'payment.updated' && data?.id);

      if (paymentId) {
        const result = await payment.get({ id: paymentId });
        
        if (result.status === 'approved') {
          const externalReference = result.external_reference;
          
          // 1. Find the order in Firestore using paymentId
          const pedidosRef = adminDb.collection('pedidos');
          const snapshot = await pedidosRef.where('paymentId', '==', paymentId.toString()).get();

          if (!snapshot.empty) {
            const pedidoDoc = snapshot.docs[0];
            const pedidoData = pedidoDoc.data();

            if (pedidoData.status !== 'pago') {
              // 2. Update order status
              await pedidoDoc.ref.update({
                status: 'pago',
                pagoEm: new Date()
              });

              // 3. Update numbers status
              const batch = adminDb.batch();
              const numeros = pedidoData.numeros as number[];
              
              for (const n of numeros) {
                const numRef = adminDb.collection('numeros').doc(n.toString());
                batch.update(numRef, {
                  status: 'pago',
                  updatedAt: new Date()
                });
              }

              await batch.commit();
              console.log(`Success: Order ${pedidoDoc.id} and numbers [${numeros.join(', ')}] updated to PAGO`);
            }
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook error:', error);
      res.sendStatus(200); // Always return 200 to MP to avoid loops, but log the error
    }
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
