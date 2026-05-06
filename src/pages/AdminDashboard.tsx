import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  useNumerosRealtime 
} from '../hooks/useNumerosRealtime';
import { 
  usePedidosRealtime 
} from '../hooks/usePedidosRealtime';
import { 
  updateNumeroStatus, 
  resetRifa,
  reservarNumeros 
} from '../firebase/services';
import { formatCurrency, cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Ticket, 
  DollarSign, 
  RefreshCcw, 
  LogOut,
  Settings,
  User,
  Plus,
  Phone,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban
} from 'lucide-react';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { Numero } from '../types';

export default function AdminDashboard() {
  const { numeros, loading: loadingNumeros } = useNumerosRealtime();
  const { pedidos, loading: loadingPedidos } = usePedidosRealtime(50);
  
  const [selectedNum, setSelectedNum] = useState<Numero | null>(null);
  const [manualForm, setManualForm] = useState({ 
    numero: '', 
    nome: '', 
    telefone: '',
    status: 'pago' as Numero['status']
  });
  
  const [reseting, setReseting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const sold = numeros.filter(n => n.status === 'pago').length;
    const reserved = numeros.filter(n => n.status === 'reservado').length;
    
    // Calculate total from actual paid orders
    const totalArrecadado = pedidos
      .filter(p => p.status === 'pago')
      .reduce((acc, p) => acc + p.valor, 0);
    
    return { sold, reserved, revenue: totalArrecadado };
  }, [numeros, pedidos]);

  const handleManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.numero) return;
    
    const numId = manualForm.numero;
    const existing = numeros.find(n => n.id === numId);
    
    if (!existing) {
      alert('Número inválido');
      return;
    }

    try {
      if (manualForm.status === 'pago' || manualForm.status === 'reservado') {
        // Use the reserve service to add data
        await reservarNumeros(
          [parseInt(numId)], 
          manualForm.nome || 'Venda Manual Admin', 
          manualForm.telefone || 'Admin'
        );
        
        if (manualForm.status === 'pago') {
          await updateNumeroStatus(numId, 'pago');
        }
      } else {
        await updateNumeroStatus(numId, manualForm.status);
      }
      
      setManualForm({ numero: '', nome: '', telefone: '', status: 'pago' });
    } catch (err) {
      console.error(err);
      alert('Erro ao processar');
    }
  };

  const updateStatus = async (id: string, status: Numero['status']) => {
    try {
      await updateNumeroStatus(id, status);
      setSelectedNum(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    if (!confirm('ATENÇÃO: Isso irá resetar todos os 100 números para DISPONÍVEL. Deseja continuar?')) return;
    setReseting(true);
    try {
      await resetRifa(100);
      alert('Rifa resetada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao resetar rifa');
    } finally {
      setReseting(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/admin/login');
  };

  const filteredPedidos = pedidos.filter(p => 
    (p.nome && p.nome.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.telefone && p.telefone.includes(searchTerm)) ||
    (p.numeros && p.numeros.some(n => n.toString().includes(searchTerm)))
  );

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Sidebar Desktop */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-black border-r border-white/5 hidden lg:flex flex-col z-30">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Admin<span className="text-neon-green">Prime</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="flex items-center gap-3 p-3 bg-neon-green/10 text-neon-green font-bold uppercase tracking-widest text-xs border border-neon-green/20">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </a>
          <button 
            onClick={() => window.open('/', '_blank')}
            className="w-full flex items-center gap-3 p-3 text-white/40 hover:text-white transition-colors uppercase font-bold text-xs tracking-widest"
          >
            <ExternalLink className="w-4 h-4" /> Ver Site
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-white/40 hover:text-white transition-colors uppercase font-bold text-xs tracking-widest"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Painel de Controle</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Controle total da rifa rifaprime-191f6</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-neon-green/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <button 
                onClick={handleReset}
                disabled={reseting}
                className="relative flex items-center gap-2 btn-outline border-white/10 text-white hover:bg-red-500 hover:text-white hover:border-red-500 transition-all h-12 px-6"
              >
                <RefreshCcw className={cn("w-4 h-4", reseting && "animate-spin")} /> 
                {reseting ? 'Resetando...' : 'Resetar Rifa'}
              </button>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card-brutal group">
            <div className="flex justify-between items-start mb-4">
              <Ticket className="w-6 h-6 text-neon-green" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neon-green">Total Vendido</span>
            </div>
            <p className="text-5xl font-black italic tracking-tighter leading-none group-hover:text-neon-green transition-colors">{stats.sold}</p>
            <p className="text-white/40 text-xs mt-2 uppercase font-bold">Números Pagos</p>
          </div>

          <div className="card-brutal group">
            <div className="flex justify-between items-start mb-4">
              <Clock className="w-6 h-6 text-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Reservados</span>
            </div>
            <p className="text-5xl font-black italic tracking-tighter leading-none group-hover:text-yellow-500 transition-colors">{stats.reserved}</p>
            <p className="text-white/40 text-xs mt-2 uppercase font-bold">Aguardando PIX</p>
          </div>

          <div className="card-brutal group">
            <div className="flex justify-between items-start mb-4">
              <DollarSign className="w-6 h-6 text-neon-green neon-glow" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neon-green">Arrecadado</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-black italic tracking-tighter leading-none group-hover:text-neon-green transition-colors">
                {formatCurrency(stats.revenue).split(',')[0]}
              </p>
              <span className="text-xl font-black text-white/40">,00</span>
            </div>
            <p className="text-white/40 text-xs mt-2 uppercase font-bold">Saldo por Pedidos Pagos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Number Grid Control */}
          <div className="xl:col-span-8 space-y-6">
            <div className="card-brutal border-white/5">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Mapa de Números</h3>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-white/10 rounded-full" />
                     <span className="text-[10px] font-bold uppercase text-white/40">DISP</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                     <span className="text-[10px] font-bold uppercase text-white/40">RES</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-red-500 rounded-full" />
                     <span className="text-[10px] font-bold uppercase text-white/40">PAGO</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-white/30 rounded-full" />
                     <span className="text-[10px] font-bold uppercase text-white/40">BLOQ</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {numeros.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNum(n)}
                    className={cn(
                      "relative aspect-square flex items-center justify-center text-sm font-black border transition-all hover:scale-110 z-0",
                      selectedNum?.id === n.id && "z-10 ring-2 ring-neon-green border-neon-green bg-neon-green/10",
                      n.status === 'disponivel' && "bg-white/5 border-white/10 hover:border-neon-green",
                      n.status === 'reservado' && "bg-yellow-500 text-black border-yellow-500",
                      n.status === 'pago' && "bg-red-500 text-white border-red-500",
                      n.status === 'bloqueado' && "bg-white/10 text-white/20 border-white/5"
                    )}
                  >
                    {n.numero}
                  </button>
                ))}
              </div>
            </div>

            {/* Pedidos List */}
            <div className="card-brutal border-white/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-white/5 gap-4">
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">Pedidos Recentes</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Sincronizado com Mercado Pago</p>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text"
                    placeholder="Buscar pedido..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-white/5 border border-white/10 pl-10 pr-4 py-2 text-sm focus:border-neon-green outline-none w-full md:w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-white/20 border-b border-white/5">
                      <th className="py-4 font-black">Cliente</th>
                      <th className="py-4 font-black">Números</th>
                      <th className="py-4 font-black">Valor</th>
                      <th className="py-4 font-black">Status</th>
                      <th className="py-4 font-black">Data</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredPedidos.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-black uppercase tracking-tighter text-sm group-hover:text-neon-green transition-colors">{p.nome}</span>
                            <span className="text-white/40 font-mono">{p.telefone}</span>
                          </div>
                        </td>
                        <td className="py-4 text-white/40">
                          <div className="flex flex-wrap gap-1">
                            {p.numeros?.map(n => (
                              <span key={n} className="px-1.5 py-0.5 bg-white/5 border border-white/10 font-bold">
                                {n.toString().padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 font-black uppercase text-sm">
                          {formatCurrency(p.valor)}
                        </td>
                        <td className="py-4">
                          <span className={cn(
                            "px-2 py-1 font-black uppercase text-[9px] tracking-widest border",
                            p.status === 'pago' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          )}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 text-white/20 font-mono text-[10px]">
                          {p.criadoEm?.toDate?.() ? p.criadoEm.toDate().toLocaleString('pt-BR') : 'Sem data'}
                        </td>
                      </tr>
                    ))}
                    {filteredPedidos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-white/20 uppercase font-black text-sm">Nenhum pedido encontrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Actions & Detail Sidebar */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Number Detail Modal/Section */}
            <AnimatePresence mode="wait">
              {selectedNum && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card-brutal border-neon-green/40 bg-neon-green/[0.02]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Detalhes: #{selectedNum.numero}</h3>
                    <button onClick={() => setSelectedNum(null)} className="text-white/20 hover:text-white transition-colors">Voltar</button>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="p-3 bg-white/5 border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Status Atual</p>
                      <p className={cn(
                        "text-sm font-black uppercase tracking-tighter",
                        selectedNum.status === 'pago' && "text-red-500",
                        selectedNum.status === 'reservado' && "text-yellow-500",
                        selectedNum.status === 'disponivel' && "text-white",
                        selectedNum.status === 'bloqueado' && "text-white/40"
                      )}>
                        {selectedNum.status}
                      </p>
                    </div>

                    {selectedNum.reservadoPor && (
                      <>
                        <div className="p-3 bg-white/5 border border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Reservado Por</p>
                          <p className="text-sm font-black uppercase">{selectedNum.reservadoPor}</p>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">WhatsApp</p>
                          <p className="text-sm font-black">{selectedNum.telefone}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => updateStatus(selectedNum.id, 'disponivel')}
                      className="p-3 border border-white/10 hover:bg-white/10 transition-colors uppercase font-black text-[10px] tracking-widest text-white"
                    >
                      Disponível
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedNum.id, 'reservado')}
                      className="p-3 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10 transition-colors uppercase font-black text-[10px] tracking-widest"
                    >
                      Reservado
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedNum.id, 'pago')}
                      className="p-3 border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors uppercase font-black text-[10px] tracking-widest"
                    >
                      Pago
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedNum.id, 'bloqueado')}
                      className="p-3 border border-white/5 text-white/20 hover:bg-white/5 transition-colors uppercase font-black text-[10px] tracking-widest"
                    >
                      Bloquear
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manual Sale Form */}
            <div className="card-brutal">
              <div className="flex items-center gap-3 mb-6">
                <Plus className="w-5 h-5 text-neon-green" />
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Registrar Venda</h3>
              </div>
              
              <form onSubmit={handleManualAction} className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-1">Nº</label>
                    <input 
                      required
                      type="number"
                      min="1"
                      max="100"
                      value={manualForm.numero}
                      onChange={e => setManualForm({ ...manualForm, numero: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 p-3 text-center focus:border-neon-green outline-none font-black"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-1">Status a Definir</label>
                    <select
                      value={manualForm.status}
                      onChange={e => setManualForm({ ...manualForm, status: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 p-3 focus:border-neon-green outline-none font-black text-xs uppercase"
                    >
                      <option value="pago" className="bg-black">Pagar Agora</option>
                      <option value="reservado" className="bg-black">Reservar</option>
                      <option value="bloqueado" className="bg-black">Bloquear</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-1">Nome do Cliente</label>
                  <input 
                    type="text"
                    value={manualForm.nome}
                    onChange={e => setManualForm({ ...manualForm, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:border-neon-green outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-1">WhatsApp</label>
                  <input 
                    type="tel"
                    value={manualForm.telefone}
                    onChange={e => setManualForm({ ...manualForm, telefone: e.target.value })}
                    placeholder="Ex: 5511999999999"
                    className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:border-neon-green outline-none"
                  />
                </div>

                <button type="submit" className="w-full btn-primary h-14 flex items-center justify-center gap-2 text-sm uppercase">
                  Confirmar Action
                </button>
                
                <p className="text-[9px] text-white/20 leading-relaxed uppercase font-black text-center">
                  Esta ação ignora o Mercado Pago e reserva/paga diretamente no banco de dados.
                </p>
              </form>
            </div>

            {/* Quick Summary */}
            <div className="card-brutal bg-neon-green/5 border-neon-green/10">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-neon-green mb-4">Informações do Projeto</h4>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Firebase ID:</span>
                  <span className="font-mono">rifaprime-191f6</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Regras de Segurança:</span>
                  <span className="text-neon-green">Ativas</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Webhook URL:</span>
                  <span className="truncate max-w-[150px] font-mono opacity-50">/api/webhook</span>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2 text-neon-green mb-1">
                    <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Realtime Active</span>
                  </div>
                  <p className="text-[9px] text-white/40 leading-tight">Painel sincronizado instantaneamente com o banco de dados via Firestore Snapshots.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
