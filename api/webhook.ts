import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { adminDb } from '../lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
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

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('Webhook processing error:', error.response?.data || error.message);
    return res.status(200).send('OK'); // Always return 200 to MP
  }
}
