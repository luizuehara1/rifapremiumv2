import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Numero } from '../types';

interface RaffleGridProps {
  numeros: Numero[];
  selected: number[];
  onSelect: (numero: number) => void;
}

export default function RaffleGrid({ numeros, selected, onSelect }: RaffleGridProps) {
  return (
    <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-3">
      {numeros.map((n, idx) => {
        const isSelected = selected.includes(n.numero);
        
        return (
          <motion.button
            key={n.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.005 }}
            onClick={() => n.status === 'disponivel' && onSelect(n.numero)}
            disabled={n.status !== 'disponivel'}
            className={cn(
              "relative aspect-square flex items-center justify-center text-lg font-black border transition-all duration-200",
              // Status styles
              n.status === 'disponivel' && !isSelected && "bg-white/5 border-white/10 hover:border-neon-green hover:bg-neon-green/5 text-white",
              n.status === 'disponivel' && isSelected && "bg-neon-green border-neon-green text-black scale-110 z-10 shadow-[0_0_20px_rgba(0,255,0,0.4)]",
              n.status === 'reservado' && "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 cursor-not-allowed",
              n.status === 'pago' && "bg-red-500/10 border-red-500/30 text-red-500 cursor-not-allowed shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]",
              n.status === 'bloqueado' && "bg-white/5 border-white/5 text-white/20 cursor-not-allowed grayscale"
            )}
          >
            {n.numero.toString().padStart(2, '0')}
            
            {/* Status indicators */}
            {n.status === 'pago' && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500" />
            )}
            {n.status === 'reservado' && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 animate-pulse" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
