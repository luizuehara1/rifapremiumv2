import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, CheckCircle2, Phone, User, QrCode, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import axios from 'axios';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: number[];
  totalPrice: number;
}

export default function CheckoutModal({ isOpen, onClose, selectedNumbers, totalPrice }: CheckoutModalProps) {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; id: string } | null>(null);
  const [formData, setFormData] = useState({ nome: '', telefone: '' });
  const [copied, setCopied] = useState(false);

  // Monitor payment status
  useEffect(() => {
    if (pixData?.id && isOpen) {
      const q = query(
        collection(db, 'pedidos'),
        where('paymentId', '==', pixData.id.toString())
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const pedido = snapshot.docs[0].data();
          if (pedido.status === 'pago') {
            setStep('success');
            // Fechar após 5 segundos se estiver no sucesso
            setTimeout(() => {
              window.location.reload(); // Recarrega para limpar seleção e atualizar grid
            }, 5000);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [pixData?.id, isOpen]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create PIX and Order in Backend
      const { data } = await axios.post('/api/create-pix', {
        numeros: selectedNumbers,
        valor: totalPrice,
        nome: formData.nome,
        telefone: formData.telefone
      });

      setPixData(data);
      setStep('payment');
    } catch (error: any) {
      console.error('Checkout error:', error);
      
      const errorMessage = 
        error?.response?.data?.error || 
        error?.response?.data?.details?.message ||
        error?.message || 
        'Erro ao processar checkout. Tente novamente.';

      alert(errorMessage);
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
                  </div>

                  <button
                    disabled={loading}
                    className="w-full btn-primary h-16 flex items-center justify-center text-xl tracking-tighter"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      'GERAR PAGAMENTO PIX'
                    )}
                  </button>
                </form>
              ) : step === 'payment' ? (
                <div className="space-y-6 text-center">
                  <div className="bg-white p-4 inline-block rounded-lg shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    <img 
                      src={`data:image/png;base64,${pixData?.qr_code_base64}`} 
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-neon-green">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Aguardando Pagamento...</p>
                    </div>
                    
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
                      <li>Após o pagamento, esta tela fechará automaticamente</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-6">
                  <div className="w-24 h-24 bg-neon-green/20 border-2 border-neon-green rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-neon-green" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-neon-green">PAGAMENTO CONFIRMADO!</h3>
                    <p className="text-sm text-white/60 mt-2">Seus números foram reservados com sucesso.</p>
                  </div>
                  <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest animate-pulse">Recarregando página...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
