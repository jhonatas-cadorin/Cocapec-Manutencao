import { useState } from 'react';
import { auth } from '../lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao enviar e-mail. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Mail size={40} />
        </div>
        
        <h1 className="text-3xl font-display font-black text-slate-900 mb-4 uppercase tracking-tight">
          Verifique seu E-mail
        </h1>
        
        <p className="text-slate-500 font-medium mb-8">
          Enviamos um link de verificação para o seu e-mail. Por favor, verifique sua caixa de entrada (e a pasta de spam) para ativar seu acesso.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RefreshCw size={18} />
            Já verifiquei meu e-mail
          </button>

          <button
            onClick={handleResend}
            disabled={loading || sent}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border ${
              sent 
                ? 'bg-green-50 border-green-200 text-green-600' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {sent ? (
              <>
                <CheckCircle2 size={18} />
                E-mail enviado!
              </>
            ) : (
              <>
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <Mail size={18} />}
                Reenviar e-mail de verificação
              </>
            )}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs text-red-500 hover:bg-red-50 transition-all mt-4"
          >
            <LogOut size={18} />
            Sair e entrar com outra conta
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Acesso restrito para colaboradores
        </div>
      </motion.div>
    </div>
  );
}
