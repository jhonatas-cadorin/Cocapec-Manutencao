import { useState, FormEvent } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAppSettings } from '../hooks/useAppSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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

        // If email is not verified (rare for Google but possible), send verification
        if (!user.emailVerified) {
          await sendEmailVerification(user);
        } else {
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
      }
    } catch (err: any) {
      console.error(err);
      setError('Falha ao autenticar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        if (!name) {
          setError('Nome é obrigatório.');
          setLoading(false);
          return;
        }

        // 1. Create Auth User
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // 2. Send Verification Email (MANDATORY)
        await sendEmailVerification(user);
        
        // Note: We don't create the Firestore doc yet because rules 
        // require email_verified == true. The doc will be created 
        // on their first login AFTER verification.
        
        setError('E-mail de verificação enviado! Por favor, verifique sua conta antes de entrar.');
        setMode('login');
      } else {
        // Login
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        if (!user.emailVerified) {
          setError('Por favor, verifique seu e-mail antes de acessar o sistema.');
          return;
        }

        // If verified, ensure profile exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() && user.emailVerified) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: name || user.displayName || 'Usuário',
            role: user.email === 'Jhonatas.Cadorin@gmail.com' ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp()
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres.');
      else if (err.code === 'auth/user-not-found') setError('Usuário não encontrado.');
      else if (err.code === 'auth/wrong-password') setError('Senha incorreta.');
      else setError('Falha na autenticação.');
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
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8 font-mono">Gestão de Manutenção Predial</p>

        {error && (
          <div className={`mb-6 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
            error.includes('enviado') ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-3 mb-6">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative"
              >
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Seu Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold text-sm"
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              placeholder="e-mail institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold text-sm"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              placeholder="senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : (
              <>
                {mode === 'login' ? 'Entrar no Sistema' : 'Criar minha Conta'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="relative my-8 text-center">
           <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-100"></div>
           <span className="relative bg-white px-4 text-[9px] font-black uppercase tracking-widest text-slate-300">ou continue com</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" referrerPolicy="no-referrer" />
          Google Workspace
        </button>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
             {mode === 'login' ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
           </p>
           <button 
             onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
             className="text-[10px] text-slate-900 font-black uppercase tracking-widest hover:underline"
           >
             {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
