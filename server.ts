import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { MercadoPagoConfig, Payment } from 'mercadopago';

import axios from 'axios';
import { adminDb } from './lib/firebase-admin';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mercado Pago Config
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  // API Routes
  app.post('/api/create-pix', async (req, res) => {
    if (!accessToken) {
      console.log('Mercado Pago Token: Não configurado');
      return res.status(500).json({ 
        error: "MERCADO_PAGO_ACCESS_TOKEN não configurado no painel de Secrets." 
      });
    }

    console.log('Mercado Pago Token: Existe');

    try {
      const { numeros, valor, nome, telefone } = req.body;

      if (!numeros || !valor || !nome || !telefone) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      }

      const paymentData = {
        transaction_amount: Number(valor),
        description: `Rifa Premium - Números: ${numeros.join(', ')}`,
        payment_method_id: 'pix',
        payer: {
          email: `${telefone}@temp.com`,
          first_name: nome,
        },
        external_reference: `${Date.now()}`,
      };

      const response = await axios.post('https://api.mercadopago.com/v1/payments', paymentData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${Date.now()}`
        }
      });

      const result = response.data;
      const paymentId = result.id?.toString();

      // Salvar Pedido no Firestore
      const pedidoData = {
        paymentId,
        numeros,
        valor: Number(valor),
        nome,
        telefone,
        status: 'pendente',
        criadoEm: new Date(),
      };

      await adminDb.collection('pedidos').add(pedidoData);

      // Também reservar os números
      const batch = adminDb.batch();
      for (const n of numeros) {
        const numRef = adminDb.collection('numeros').doc(n.toString());
        batch.set(numRef, {
          numero: n,
          status: 'reservado',
          nome,
          telefone,
          updatedAt: new Date()
        }, { merge: true });
      }
      await batch.commit();

      res.json({
        id: paymentId,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        payment_id: paymentId
      });
    } catch (error: any) {
      const apiError = error.response?.data || error.message;
      console.error('Error creating PIX:', apiError);
      
      if (error.response?.status === 401) {
        return res.status(401).json({ 
          error: 'Erro de autenticação com o Mercado Pago. Verifique o Access Token.',
          details: apiError
        });
      }

      res.status(500).json({ 
        error: 'Erro ao criar pagamento no Mercado Pago',
        details: apiError
      });
    }
  });

  app.post('/api/webhook', async (req, res) => {
    if (!accessToken) return res.status(500).send('Token missing');

    try {
      const { query, body } = req;
      const topic = query.topic || query.type || body.type;
      const id = query.id || (body.data && body.data.id) || body.id;

      console.log(`Webhook received: topic=${topic}, id=${id}`);

      if ((topic === 'payment' || topic === 'payment.updated') && id) {
        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const paymentData = response.data;

        if (paymentData.status === 'approved') {
          const paymentId = paymentData.id?.toString();
          console.log(`Payment confirmed: ${paymentId}`);

          const pedidosRef = adminDb.collection('pedidos');
          const snapshot = await pedidosRef.where('paymentId', '==', paymentId).get();

          if (!snapshot.empty) {
            const pedidoDoc = snapshot.docs[0];
            const pedidoData = pedidoDoc.data();
            
            if (pedidoData.status !== 'pago') {
              await pedidoDoc.ref.update({ 
                status: 'pago',
                pagoEm: new Date()
              });

              const batch = adminDb.batch();
              const numeros = pedidoData.numeros || [];
              
              for (const n of numeros) {
                const numRef = adminDb.collection('numeros').doc(n.toString());
                batch.set(numRef, {
                  status: 'pago',
                  reservadoPor: pedidoData.telefone,
                  nome: pedidoData.nome,
                  timestampReserva: Date.now(),
                  updatedAt: new Date()
                }, { merge: true });
              }
              
              await batch.commit();
              console.log(`Pedido e números atualizados para PAGO`);
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('Webhook processing error:', error.response?.data || error.message);
      res.status(200).send('OK');
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
