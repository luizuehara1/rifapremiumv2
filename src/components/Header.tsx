import { motion } from 'motion/react';
import { Ticket, ShieldCheck, Zap } from 'lucide-react';

export default function Header() {
  return (
    <header className="relative py-12 overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.1),transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          <div className="flex items-center gap-2 bg-neon-green/10 px-4 py-2 border border-neon-green/20 rounded-full">
            <ShieldCheck className="w-4 h-4 text-neon-green" />
            <span className="text-xs font-bold uppercase tracking-widest text-neon-green">Rifa Prime Oficial</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
            R$ 1.000,00 <br />
            <span className="text-neon-green neon-text-glow">NO PIX</span>
          </h1>

          <div className="flex items-center gap-8 text-sm uppercase font-bold tracking-widest text-white/40">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-green" />
              Sorteio Instantâneo
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-neon-green" />
              Apenas 100 Números
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
