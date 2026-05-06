import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import RaffleGrid from '../components/RaffleGrid';
import CheckoutModal from '../components/CheckoutModal';
import { useNumerosRealtime } from '../hooks/useNumerosRealtime';
import { usePedidosRealtime } from '../hooks/usePedidosRealtime';
import { formatCurrency, cn } from '../lib/utils';
import { Ticket, ShoppingCart, Zap, TrendingUp, Phone, Settings, Clock, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { numeros, loading } = useNumerosRealtime();
  const { pedidos, loading: loadingPedidos } = usePedidosRealtime(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const calculatePrice = (count: number) => {
    if (count === 0) return 0;
    if (count === 1) return 20;
    if (count === 2) return 35;
    if (count >= 3) {
      // 3 for 50, then each additional is ~16.66
      const baseGroupsOf3 = Math.floor(count / 3);
      const remaining = count % 3;
      let total = baseGroupsOf3 * 50;
      if (remaining === 1) total += 20;
      if (remaining === 2) total += 35;
      return total;
    }
    return count * 20;
  };

  const totalPrice = useMemo(() => calculatePrice(selectedNumbers.length), [selectedNumbers]);

  const toggleSelect = (num: number) => {
    setSelectedNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const progress = useMemo(() => {
    if (numeros.length === 0) return 0;
    const sold = numeros.filter(n => n.status === 'pago').length;
    return (sold / numeros.length) * 100;
  }, [numeros]);

  return (
    <div className="min-h-screen pb-32">
      <Header />

      <main className="container mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Grid Section */}
          <div className="lg:col-span-8 space-y-6">
            {/* Progress Card */}
            <div className="card-brutal bg-black/60 backdrop-blur-md">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-neon-green mb-1">Status das Reservas</h3>
                  <p className="text-2xl font-black italic tracking-tighter uppercase">Progresso do Sorteio</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-neon-green">{progress.toFixed(0)}%</p>
                </div>
              </div>
              <div className="h-4 bg-white/5 border border-white/10 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-neon-green neon-glow"
                />
              </div>
            </div>

            {/* Numbers Grid */}
            <div className="card-brutal">
              <div className="flex items-center gap-4 mb-8">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  <span className="w-3 h-3 bg-white/10 border border-white/20" /> Disponível
                </p>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-500">
                  <span className="w-3 h-3 bg-yellow-500/10 border border-yellow-500/30" /> Reservado
                </p>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500">
                  <span className="w-3 h-3 bg-red-500/10 border border-red-500/30" /> Pago
                </p>
              </div>

              {loading ? (
                <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <RaffleGrid 
                  numeros={numeros} 
                  selected={selectedNumbers} 
                  onSelect={toggleSelect} 
                />
              )}
            </div>

            {/* Recent Activity Table (Same as Admin) */}
            <div className="card-brutal">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-5 h-5 text-neon-green" />
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Atividades Recentes</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-white/20 border-b border-white/5">
                      <th className="py-4">Nome</th>
                      <th className="py-4">Números</th>
                      <th className="py-4">Valor</th>
                      <th className="py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {pedidos.slice(0, 5).map((p) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 font-black uppercase tracking-tighter">{p.nome}</td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1">
                            {p.numeros?.map(n => (
                              <span key={n} className="px-1.5 py-0.5 bg-white/5 border border-white/10 font-bold">
                                {n.toString().padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 font-black">{formatCurrency(p.valor)}</td>
                        <td className="py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 font-bold uppercase text-[9px] border",
                            p.status === 'pago' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          )}>
                            {p.status === 'pago' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {p.status}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pedidos.length === 0 && !loadingPedidos && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-white/20 font-black uppercase tracking-widest">Nenhuma atividade recente</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar / Stats Section */}
          <div className="lg:col-span-4 space-y-6">
            {/* Combo Offers */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Promoções Ativas</h3>
              
              <div className="grid grid-cols-1 gap-3">
                {[
                  { qty: 1, price: 20, tag: 'Básico' },
                  { qty: 2, price: 35, tag: 'Popular', popular: true },
                  { qty: 3, price: 50, tag: 'Melhor Valor' },
                ].map((combo) => (
                  <div 
                    key={combo.qty}
                    className={cn(
                      "card-brutal p-4 flex items-center justify-between border-white/10",
                      combo.popular && "border-neon-green/40 bg-neon-green/5"
                    )}
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neon-green mb-1">{combo.tag}</p>
                      <p className="text-xl font-black italic uppercase tracking-tighter">
                        {combo.qty} {combo.qty === 1 ? 'Número' : 'Números'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">{formatCurrency(combo.price)}</p>
                      <p className="text-[10px] text-white/40 font-bold uppercase">Pagamento PIX</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest Sales / Info */}
            <div className="card-brutal space-y-4">
              <div className="flex items-center gap-3 text-neon-green">
                <Zap className="w-5 h-5" />
                <h4 className="font-black italic uppercase tracking-tighter">Como Funciona?</h4>
              </div>
              <ul className="space-y-3 text-sm text-white/60">
                <li className="flex gap-3">
                  <span className="text-neon-green font-black">01.</span>
                  Escolha seus números da sorte no grid.
                </li>
                <li className="flex gap-3">
                  <span className="text-neon-green font-black">02.</span>
                  Clique em "Pagar Agora" para gerar o PIX.
                </li>
                <li className="flex gap-3">
                  <span className="text-neon-green font-black">03.</span>
                  O sistema valida e reserva seu número em tempo real.
                </li>
                <li className="flex gap-3">
                  <span className="text-neon-green font-black">04.</span>
                  O sorteio acontece ao completar todos os números.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </main>

      {/* Footer / Admin Access */}
      <footer className="container mx-auto px-4 py-20 border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Rifa<span className="text-neon-green">Prime</span></h2>
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">rifaprime-191f6 &copy; 2026 - Todos os direitos reservados</p>
          </div>

          <div className="flex gap-4">
            <a 
              href={`https://wa.me/${import.meta.env.VITE_STORE_WHATSAPP}`}
              target="_blank"
              className="px-6 py-3 bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-neon-green hover:text-black transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" /> Suporte WhatsApp
            </a>
            <a 
              href="/admin/login"
              className="px-6 py-3 border border-neon-green/20 text-neon-green text-xs font-black uppercase tracking-widest hover:bg-neon-green/10 transition-all flex items-center gap-2"
            >
              <Settings className="w-4 h-4" /> Acesso Administrativo
            </a>
          </div>
        </div>
      </footer>

      {/* Sticky Bottom Bar */}
      {selectedNumbers.length > 0 && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 p-4"
        >
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-black border border-white/10 p-4 md:p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex -space-x-2">
                  {selectedNumbers.slice(0, 5).map(n => (
                    <div key={n} className="w-10 h-10 bg-neon-green text-black flex items-center justify-center font-black border-2 border-black">
                      {n.toString().padStart(2, '0')}
                    </div>
                  ))}
                  {selectedNumbers.length > 5 && (
                    <div className="w-10 h-10 bg-white/10 text-white flex items-center justify-center font-black border-2 border-black backdrop-blur-md">
                      +{selectedNumbers.length - 5}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neon-green">{selectedNumbers.length} selecionados</p>
                  <p className="text-2xl font-black italic uppercase tracking-tighter">{formatCurrency(totalPrice)}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full md:w-auto btn-primary h-16 px-12 flex items-center justify-center gap-3 text-xl tracking-tighter group"
              >
                <ShoppingCart className="w-6 h-6 transition-transform group-hover:-translate-y-1" />
                PAGAR AGORA
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)}
        selectedNumbers={selectedNumbers}
        totalPrice={totalPrice}
      />
    </div>
  );
}
