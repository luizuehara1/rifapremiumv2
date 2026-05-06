import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Pedido } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Search, Package, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MyOrders() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const q = query(
        collection(db, 'pedidos'),
        where('telefone', '==', phone),
        orderBy('criadoEm', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Pedido[];
      setPedidos(data);
    } catch (error) {
      console.error('Error searching orders:', error);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-brutal">
      <div className="flex items-center gap-3 mb-6">
        <Package className="w-5 h-5 text-neon-green" />
        <h3 className="text-xl font-black italic uppercase tracking-tighter">Meus Pedidos</h3>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text"
              placeholder="Digite seu telefone (DDD + Número)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 py-3 pl-12 pr-4 focus:border-neon-green outline-none transition-colors text-sm"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="px-6 bg-neon-green text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">
          Consulte seus números e status de pagamento pelo telefone
        </p>
      </form>

      <AnimatePresence mode="wait">
        {pedidos && pedidos.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {pedidos.map((p) => (
              <div key={p.id} className="p-4 bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-black uppercase border",
                      p.status === 'pago' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    )}>
                      {p.status}
                    </span>
                    <span className="text-[10px] text-white/20 font-bold uppercase">
                      {p.paymentId ? `#${p.paymentId.slice(-6)}` : p.id.slice(-6)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.numeros?.map(n => (
                      <span key={n} className="px-1.5 py-0.5 bg-white/10 border border-white/10 font-bold text-xs">
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-black text-lg">{formatCurrency(p.valor)}</p>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                    {p.criadoEm?.toDate ? p.criadoEm.toDate().toLocaleDateString('pt-BR') : 'Recentemente'}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        ) : hasSearched && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-10 text-center text-white/20 font-black uppercase tracking-widest border border-dashed border-white/10"
          >
            Nenhum pedido encontrado para este número
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
