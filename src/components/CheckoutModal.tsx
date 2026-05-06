import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, CheckCircle2, Phone, User, QrCode } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import axios from 'axios';
import { createPedido, reservarNumeros } from '../firebase/services';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: number[];
  totalPrice: number;
}

export default function CheckoutModal({ isOpen, onClose, selectedNumbers, totalPrice }: CheckoutModalProps) {
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; ticket_url: string; id: string } | null>(null);
  const [formData, setFormData] = useState({ nome: '', telefone: '', cpf: '' });
  const [copied, setCopied] = useState(false);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create PIX in Mercado Pago
      const { data } = await axios.post('/api/create-pix', {
        amount: totalPrice,
        description: `Rifa Premium - Números: ${selectedNumbers.join(', ')}`,
        payer: {
          email: 'payer@example.com', // In a real app, collect email
          first_name: formData.nome,
          identification: {
            number: formData.cpf
          }
        },
        external_reference: `${Date.now()}`
      });

      setPixData(data);

      // 2. Reserve numbers in Firebase
      await reservarNumeros(selectedNumbers, formData.nome, formData.telefone);

      // 3. Create order in Firebase
      await createPedido({
        paymentId: data.id.toString(),
        numeros: selectedNumbers,
        valor: totalPrice,
        nome: formData.nome,
        telefone: formData.telefone,
        status: 'pendente',
        criadoEm: null
      });

      setStep('payment');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erro ao processar checkout. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Finalizar Pedido</h2>
                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Reserva de 10 minutos</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {step === 'info' ? (
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Total</p>
                      <p className="text-xl font-black text-neon-green">{formatCurrency(totalPrice)}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Números</p>
                      <p className="text-xl font-black">{selectedNumbers.length.toString().padStart(2, '0')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        required
                        type="text"
                        placeholder="Nome Completo"
                        value={formData.nome}
                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 py-4 pl-12 pr-4 focus:border-neon-green outline-none transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        required
                        type="tel"
                        placeholder="WhatsApp (com DDD)"
                        value={formData.telefone}
                        onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 py-4 pl-12 pr-4 focus:border-neon-green outline-none transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        required
                        type="text"
                        placeholder="CPF (apenas números)"
                        value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 py-4 pl-12 pr-4 focus:border-neon-green outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full btn-primary h-16 flex items-center justify-center text-xl tracking-tighter"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'GERAR PAGAMENTO PIX'
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="bg-white p-4 inline-block rounded-lg shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    <img 
                      src={`data:image/png;base64,${pixData?.qr_code_base64}`} 
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-white/60">Aponte a câmera ou copie o código abaixo:</p>
                    
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={pixData?.qr_code}
                        className="flex-1 bg-white/5 border border-white/10 p-3 text-xs text-white/40 truncate outline-none"
                      />
                      <button
                        onClick={handleCopy}
                        className="p-3 bg-neon-green text-black hover:bg-white transition-colors"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-neon-green/5 border border-neon-green/20 rounded-none text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="w-4 h-4 text-neon-green" />
                      <p className="text-xs font-black text-neon-green uppercase tracking-widest">Instruções</p>
                    </div>
                    <ol className="text-xs text-white/60 space-y-2 list-decimal ml-4">
                      <li>Abra o app do seu banco</li>
                      <li>Vá em Área PIX {'>'} Ler QR Code ou Copia e Cola</li>
                      <li>Após o pagamento, o status atualizará automaticamente</li>
                      <li>A reserva expira em 10 minutos se não houver pagamento</li>
                    </ol>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full py-4 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Voltar para a Rifa
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
