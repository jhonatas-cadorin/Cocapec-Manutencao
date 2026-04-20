import { useState, useEffect } from 'react';
import React from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { AppUser, NotificationPrefs, TechnicalSkill, AppSettings, UserRole } from '../types';
import { useAppSettings, updateAppSettings } from '../hooks/useAppSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Check, 
  Save, 
  Wrench,
  User as UserIcon,
  Shield,
  Smartphone,
  Zap,
  Droplet,
  Wind,
  Paintbrush,
  Hammer,
  HardHat,
  Monitor,
  Camera,
  X,
  Layers,
  Settings as SettingsIcon,
  Palette,
  AlertCircle
} from 'lucide-react';

const SKILLS: { id: TechnicalSkill; label: string; icon: any; color: string }[] = [
  { id: 'eletricista', label: 'Eletricista', icon: Zap, color: 'text-yellow-600 bg-yellow-50 font-bold' },
  { id: 'encanador', label: 'Encanador', icon: Droplet, color: 'text-blue-600 bg-blue-50 font-bold' },
  { id: 'hvac', label: 'Climatização', icon: Wind, color: 'text-indigo-600 bg-indigo-50 font-bold' },
  { id: 'pintor', label: 'Pintor', icon: Paintbrush, color: 'text-purple-600 bg-purple-50 font-bold' },
  { id: 'pedreiro', label: 'Alvenaria', icon: Hammer, color: 'text-orange-600 bg-orange-50 font-bold' },
  { id: 'limpeza', label: 'Limpeza', icon: HardHat, color: 'text-emerald-600 bg-emerald-50 font-bold' },
  { id: 'geral', label: 'Serviços Gerais', icon: Wrench, color: 'text-slate-600 bg-slate-50 font-bold' },
];

export default function Settings() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { settings: globalSettings, loading: settingsLoading } = useAppSettings();
  const [siteForm, setSiteForm] = useState<AppSettings>({
    companyName: '',
    companyLogo: '',
    supportEmail: '',
    allowSelfRegistration: true
  });

  // User Creation State
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'tech' as UserRole
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (globalSettings) {
      setSiteForm(globalSettings);
    }
  }, [globalSettings]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) {
          setUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    setUserMsg(null);

    try {
      // 1. Create in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userForm.email, userForm.password);
      const newUser = userCredential.user;

      // 2. Verification
      await sendEmailVerification(newUser);

      // 3. Firestore Profile
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: userForm.email,
        name: userForm.name,
        role: userForm.role,
        skills: [],
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      setUserMsg({ 
        type: 'success', 
        text: 'Usuário criado com sucesso! Por segurança, sua sessão foi reiniciada para validar a nova conta. Por favor, entre novamente.' 
      });
      setUserForm({ name: '', email: '', password: '', role: 'tech' });
      
      // Logout in 3 seconds to avoid session issues
      setTimeout(() => {
        auth.signOut();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      let errorText = 'Erro ao criar usuário.';
      if (err.code === 'auth/email-already-in-use') errorText = 'Este e-mail já está em uso.';
      else if (err.code === 'auth/weak-password') errorText = 'A senha deve ter pelo menos 6 caracteres.';
      setUserMsg({ type: 'error', text: errorText });
    } finally {
      setUserLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccess(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPrefs: user.notificationPrefs,
        skills: user.skills
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobal = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await updateAppSettings(siteForm);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSiteForm({ ...siteForm, companyLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSkill = (skillId: TechnicalSkill) => {
    if (!user) return;
    const currentSkills = user.skills || [];
    const newSkills = currentSkills.includes(skillId)
      ? currentSkills.filter(s => s !== skillId)
      : [...currentSkills, skillId];
    setUser({ ...user, skills: newSkills });
  };

  const toggleNotif = (key: keyof NotificationPrefs) => {
    if (!user) return;
    const currentPrefs = user.notificationPrefs || { app: true, email: false, sms: false };
    setUser({
      ...user,
      notificationPrefs: { ...currentPrefs, [key]: !currentPrefs[key] }
    });
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bento-blue-deep"></div></div>;
  if (!user) return <div>Usuário não autenticado</div>;

  const prefs = user.notificationPrefs || { app: true, email: false, sms: false };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Configurações</h1>
        <p className="text-slate-500 font-medium">Gerencie seu perfil, habilidades e notificações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bento-card">
           <div className="bento-card-header flex items-center gap-2">
              <UserIcon size={16} />
              Perfil
           </div>
           <div className="flex items-center gap-6 mt-4">
              <div className="w-20 h-20 bg-bento-blue-deep rounded-[30px] flex items-center justify-center text-3xl font-black text-white uppercase shadow-xl shadow-blue-900/10">
                 {user.name.charAt(0)}
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                 <p className="text-sm font-medium text-slate-400">{user.email}</p>
                 <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-bento-accent/10 border border-bento-accent text-bento-sidebar text-[9px] font-black uppercase tracking-widest rounded">
                       {user.role}
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Notifications Card */}
        <div className="bento-card">
           <div className="bento-card-header flex items-center gap-2">
              <Bell size={16} />
              Notificações Multicanal
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Escolha como deseja ser avisado</p>
           
           <div className="space-y-3">
              {[
                { id: 'app', label: 'Push no Navegador (PWA)', icon: Smartphone },
                { id: 'email', label: 'E-mail Institucional', icon: Mail },
                { id: 'sms', label: 'Mensagem SMS', icon: MessageSquare },
              ].map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => toggleNotif(notif.id as keyof NotificationPrefs)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    prefs[notif.id as keyof NotificationPrefs] 
                      ? 'bg-bento-blue-deep border-bento-blue-deep text-white shadow-lg shadow-blue-900/10'
                      : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                     <notif.icon size={18} className={prefs[notif.id as keyof NotificationPrefs] ? 'text-bento-accent' : 'text-slate-400'} />
                     <span className="text-xs font-bold uppercase tracking-wider">{notif.label}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                     prefs[notif.id as keyof NotificationPrefs] ? 'bg-bento-accent' : 'bg-slate-200'
                  }`}>
                     {prefs[notif.id as keyof NotificationPrefs] && <Check size={12} className="text-bento-sidebar" />}
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Technical Skills Card */}
        <div className="bento-card md:col-span-2">
           <div className="bento-card-header flex items-center gap-2">
              <Shield size={16} />
              Suas Habilidades Técnicas
           </div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Suas especialidades definem quais chamados serão priorizados para você</p>
           
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SKILLS.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex flex-col items-center justify-center p-6 rounded-[32px] border transition-all text-center gap-3 ${
                    (user.skills || []).includes(skill.id)
                      ? 'bg-white border-bento-accent shadow-xl shadow-slate-100 ring-2 ring-bento-accent/5'
                      : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    (user.skills || []).includes(skill.id) ? 'bg-bento-blue-deep text-white' : 'bg-white text-slate-300'
                  }`}>
                     <skill.icon size={24} />
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-black leading-tight ${
                    (user.skills || []).includes(skill.id) ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {skill.label}
                  </span>
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="pt-6 flex justify-end">
         <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
               success 
                ? 'bg-green-500 text-white shadow-xl shadow-green-100' 
                : 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50'
            }`}
         >
            {saving ? (
               'Salvando...'
            ) : success ? (
               <>
                  <Check size={20} />
                  Salvo com Sucesso
               </>
            ) : (
               <>
                  <Save size={20} />
                  Salvar Alterações
               </>
            )}
         </button>
      </div>
    </div>
  );
}
