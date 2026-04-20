import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAppSettings } from '../hooks/useAppSettings';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings: globalSettings } = useAppSettings();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Check if self-registration is allowed
        if (globalSettings && !globalSettings.allowSelfRegistration) {
          setError('O auto-registro está desativado. Entre em contato com o administrador.');
          await auth.signOut();
          setLoading(false);
          return;
        }

        // Create new user with default role 'user'
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Sem nome',
          role: user.email === 'Jhonatas.Cadorin@gmail.com' ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('Falha ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center border border-slate-100"
      >
        {globalSettings?.companyLogo ? (
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-xl mx-auto mb-6">
            <img src={globalSettings.companyLogo} className="w-full h-full object-contain" alt="Logo" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-4xl mx-auto mb-6">
            {globalSettings?.companyName?.charAt(0) || 'C'}
          </div>
        )}
        <h1 className="text-3xl font-display font-black text-slate-900 mb-2 uppercase tracking-tight">
           {globalSettings?.companyName || 'COCAPEC'}
        </h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-10">Gestão de Manutenção Predial</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-4 px-6 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
              Entrar com Google
            </>
          )}
        </button>

        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
          Acesso restrito para colaboradores da cooperativa
        </div>
      </motion.div>
    </div>
  );
}
