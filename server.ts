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
    const currentToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();

    if (!currentToken) {
      console.error('Mercado Pago Token: NOT CONFIGURED');
      return res.status(500).json({ 
        error: "MERCADO_PAGO_ACCESS_TOKEN não encontrado. Por favor, adicione-o nas Configurações (Secrets)." 
      });
    }

    console.log('Mercado Pago Token: Found (length: ' + currentToken.length + ')');

    try {
      const { numeros, valor, nome, telefone } = req.body;

      if (!numeros || !valor || !nome || !telefone) {
        return res.status(400).json({ error: 'Campos obrigatórios: numeros, valor, nome, telefone' });
      }

      const paymentData = {
        transaction_amount: Number(valor),
        description: `Rifa Premium - Números: ${Array.isArray(numeros) ? numeros.join(', ') : numeros}`,
        payment_method_id: 'pix',
        payer: {
          email: `${telefone.replace(/\D/g, '')}@test-customer.com`, // Sanitized email
          first_name: nome,
          // Identification is often required for PIX in MP Brazil
          identification: {
            type: 'CPF',
            number: '00000000000' // Placeholder if not provided, though real is better
          }
        },
        installments: 1,
        external_reference: `REF-${Date.now()}`,
      };

      try {
        const response = await axios.post('https://api.mercadopago.com/v1/payments', paymentData, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `IDEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`
          },
          timeout: 10000 // 10s timeout
        });

        const result = response.data;
        const paymentId = result.id?.toString();

        if (!paymentId) throw new Error('Payment ID not returned from Mercado Pago');

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

        // Reservar os números
        const batch = adminDb.batch();
        for (const n of (Array.isArray(numeros) ? numeros : [numeros])) {
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

        return res.json({
          id: paymentId,
          qr_code: result.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
          payment_id: paymentId
        });

      } catch (axiosError: any) {
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        
        console.error('Mercado Pago API Error:', {
          status,
          message: axiosError.message,
          data
        });

        if (status === 401) {
          return res.status(401).json({ 
            error: 'Token do Mercado Pago Inválido ou Expirado.',
            details: data 
          });
        }

        return res.status(status || 500).json({ 
          error: 'Erro na API do Mercado Pago', 
          details: data || axiosError.message 
        });
      }

    } catch (error: any) {
      console.error('Internal Server Error:', error);
      res.status(500).json({ 
        error: 'Erro interno ao processar pedido',
        details: error.message
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
