import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ChevronRight } from 'lucide-react';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      if (!user.email) throw new Error("Email não encontrado na conta Google.");

      // Master admins bypass list
      const masterAdmins = ['luiz.uehara1@gmail.com', 'lopesvinicius199@gmail.com', 'fabriciocosta54964@gmail.com'];
      const isMaster = masterAdmins.includes(user.email);

      const adminRef = doc(db, "admins", user.email);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists() && !isMaster) {
        await signOut(auth);
        throw new Error("Admin não encontrado");
      }

      if (!isMaster && adminSnap.exists() && adminSnap.data().ativo !== true) {
        await signOut(auth);
        throw new Error("Admin inativo");
      }

      navigate("/admin");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado ou popup fechado.');
      } else {
        setError(err.message || 'Erro ao realizar login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,0,0.1),transparent_50%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md card-brutal relative z-10 bg-black/80 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-neon-green/10 border border-neon-green/20 flex items-center justify-center rounded-full">
            <ShieldAlert className="w-10 h-10 text-neon-green" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Painel Admin</h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Acesso Restrito ao Proprietário</p>
          </div>

          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="w-full p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest"
            >
              {error}
            </motion.div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full btn-primary h-16 flex items-center justify-center gap-3 group text-xl"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                ENTRAR COM GOOGLE
                <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          <p className="text-[10px] text-white/20 uppercase font-black">rifaprime-191f6 &copy; 2026</p>
        </div>
      </motion.div>
    </div>
  );
}
