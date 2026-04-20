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

      {user.role === 'admin' && (
        <div className="space-y-6 pt-10 border-t-4 border-slate-100">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                 <SettingsIcon size={20} />
              </div>
              <div>
                 <h2 className="text-2xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">Administração do Site</h2>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configurações globais visíveis para todos os usuários</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bento-card">
                 <div className="bento-card-header flex items-center gap-2">
                    <Monitor size={16} /> Identidade Visual
                 </div>
                 <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Empresa</label>
                       <input 
                          type="text" 
                          value={siteForm.companyName}
                          onChange={(e) => setSiteForm({...siteForm, companyName: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                          placeholder="Ex: Cocapec Manutenção"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo da Empresa</label>
                       <div className="flex items-center gap-4">
                          <label className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                             <Camera size={20} className="text-slate-400" />
                             <span className="text-xs font-bold text-slate-500">Alterar Logo</span>
                             <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                          </label>
                          {siteForm.companyLogo && (
                             <div className="relative group">
                                <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-slate-200 shadow-lg">
                                   <img src={siteForm.companyLogo} className="w-full h-full object-contain" alt="Logo preview" />
                                </div>
                                <button 
                                   type="button"
                                   onClick={() => setSiteForm({ ...siteForm, companyLogo: '' })}
                                   className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                   title="Remover Logo"
                                >
                                   <X size={12} />
                                </button>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bento-card">
                 <div className="bento-card-header flex items-center gap-2">
                    <Shield size={16} /> Segurança e Suporte
                 </div>
                 <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email de Suporte Técnico</label>
                       <input 
                          type="email" 
                          value={siteForm.supportEmail || ''}
                          onChange={(e) => setSiteForm({...siteForm, supportEmail: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                          placeholder="suporte@empresa.com"
                       />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex-1">
                          <p className="text-xs font-bold uppercase tracking-tight text-slate-700">Auto-Registro</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Permite novos usuários criarem conta</p>
                       </div>
                       <button
                          onClick={() => setSiteForm({...siteForm, allowSelfRegistration: !siteForm.allowSelfRegistration})}
                          className={`w-12 h-6 rounded-full p-1 transition-all ${siteForm.allowSelfRegistration ? 'bg-green-500' : 'bg-slate-300'}`}
                       >
                          <div className={`w-4 h-4 bg-white rounded-full transition-all ${siteForm.allowSelfRegistration ? 'translate-x-6' : 'translate-x-0'}`} />
                       </button>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="flex justify-end">
              <button
                 onClick={handleSaveGlobal}
                 disabled={saving}
                 className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all"
              >
                 <Save size={18} />
                 Salvar Configurações do Site
              </button>
           </div>

           {/* Quick User Addition for Admins */}
           <div className="space-y-6 pt-10 border-t-4 border-slate-100">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                    <UserIcon size={20} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">Cadastrar Colaborador</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Adicione novos membros à equipe de manutenção</p>
                 </div>
              </div>

              <div className="bento-card">
                 {userMsg && (
                   <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${
                     userMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
                   }`}>
                     <AlertCircle size={18} className="shrink-0" />
                     <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{userMsg.text}</p>
                   </div>
                 )}

                 <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold">Nome Completo</label>
                          <input 
                             required
                             type="text" 
                             value={userForm.name}
                             onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                             className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                             placeholder="Nome do usuário"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold">E-mail Corporativo</label>
                          <input 
                             required
                             type="email" 
                             value={userForm.email}
                             onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                             className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                             placeholder="email@cocapece.com"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold">Senha Inicial</label>
                          <input 
                             required
                             type="password" 
                             value={userForm.password}
                             onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                             className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                             placeholder="Mínimo 6 caracteres"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold">Função</label>
                          <select 
                             value={userForm.role}
                             onChange={(e) => setUserForm({...userForm, role: e.target.value as UserRole})}
                             className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold appearance-none"
                          >
                             <option value="tech">Técnico</option>
                             <option value="leader">Líder</option>
                             <option value="admin">Administrador</option>
                             <option value="user">Visualizador</option>
                          </select>
                       </div>
                    </div>
                    <div className="flex justify-end pt-2">
                       <button
                          type="submit"
                          disabled={userLoading}
                          className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:brightness-110 transition-all disabled:opacity-50"
                        >
                          {userLoading ? 'Criando...' : 'Criar Novo Usuário'}
                       </button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}

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
