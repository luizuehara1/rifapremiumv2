import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { adminDb } from "../lib/firebase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("API START: webhook");
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  console.log("TOKEN EXISTS:", !!accessToken);
  console.log("QUERY:", req.query);
  console.log("BODY:", req.body);

  if (!accessToken) return res.status(500).send('Token missing');

  try {
    const { query, body } = req;
    const topic = query.topic || query.type || body.type;
    const id = query.id || (body.data && body.data.id) || body.id;

    console.log(`Processing webhook: topic=${topic}, id=${id}`);

    if ((topic === 'payment' || topic === 'payment.updated') && id) {
      console.log(`Fetching payment status for ID: ${id}`);
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const paymentData = response.data;
      console.log(`Payment Status from MP: ${paymentData.status}`);

      if (paymentData.status === 'approved') {
        const paymentId = paymentData.id?.toString();
        console.log(`Confirming payment in DB for ID: ${paymentId}`);

        const pedidosRef = adminDb.collection('pedidos');
        const snapshot = await pedidosRef.where('paymentId', '==', paymentId).get();

        if (!snapshot.empty) {
          const pedidoDoc = snapshot.docs[0];
          const pedidoData = pedidoDoc.data();
          console.log(`Found pending order: ${pedidoDoc.id}`);
          
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
            console.log(`Order and numbers updated to PAID status`);
          } else {
            console.log(`Order already marked as PAID`);
          }
        } else {
          console.log(`Order NOT found for payment ID: ${paymentId}`);
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('WEBHOOK ERROR:', error);
    const apiError = error.response?.data || error.message;
    console.error('Details:', apiError);
    return res.status(200).send('OK'); // Always return 200 to MP
  }
}
