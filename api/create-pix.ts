import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { adminDb } from "./firebase-admin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("API START: create-pix");
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  console.log("TOKEN EXISTS:", !!accessToken);
  console.log("BODY:", req.body);

  if (!accessToken) {
    return res.status(500).json({ 
      error: "MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor." 
    });
  }

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
        email: `${telefone.replace(/\D/g, '')}@pwa-rifa.com`,
        first_name: nome,
        identification: {
          type: 'CPF',
          number: '00000000000'
        }
      },
      installments: 1,
      external_reference: `REF-${Date.now()}`,
      notification_url: "https://rifapremiumv2.vercel.app/api/webhook",
    };

    console.log("Requesting Mercado Pago API...");
    const response = await axios.post('https://api.mercadopago.com/v1/payments', paymentData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `IDEMP-${Date.now()}`
      },
      timeout: 10000
    });

    const result = response.data;
    const paymentId = result.id?.toString();

    if (!paymentId) throw new Error('ID de pagamento não retornado pelo Mercado Pago');
    console.log("Payment created successfully:", paymentId);

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
    console.log("Reservation success in Firestore");

    return res.status(200).json({
      id: paymentId,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      payment_id: paymentId
    });

  } catch (error: any) {
    console.error('API ERROR:', error);
    const apiError = error.response?.data || error.message;
    
    return res.status(error.response?.status || 500).json({ 
      error: error.message || 'Erro ao processar checkout',
      details: apiError,
      stack: error.stack
    });
  }
}
