import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  browserLocalPersistence,
  setPersistence,
  getAuth
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { db, auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, UserRole, TechnicalSkill } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserCog, 
  Shield, 
  Wrench, 
  Search, 
  Trash2, 
  X, 
  Check, 
  ChevronDown,
  UserCircle,
  Mail,
  Calendar,
  Award,
  UserPlus,
  Lock,
  Save,
  AlertCircle,
  TrendingUp,
  Activity,
  Phone,
  Edit
} from 'lucide-react';

const ROLES: { value: UserRole; label: string; color: string; icon: any }[] = [
  { value: 'admin', label: 'Admin', color: 'text-purple-600 bg-purple-50 border-purple-100', icon: Shield },
  { value: 'leader', label: 'Líder', color: 'text-bento-accent bg-amber-50 border-amber-100', icon: Award },
  { value: 'tech', label: 'Técnico', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Wrench },
  { value: 'contractor', label: 'Terceirizado', color: 'text-orange-600 bg-orange-50 border-orange-100', icon: UserCircle },
  { value: 'user', label: 'Usuário', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: Users },
];

const SKILLS: TechnicalSkill[] = ['eletricista', 'encanador', 'hvac', 'pintor', 'pedreiro', 'limpeza', 'geral'];

export default function UserAdmin() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Registration State
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'tech' as UserRole,
    skills: [] as TechnicalSkill[],
    phone: ''
  });

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as AppUser)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    const userToUpdate = users.find(u => u.uid === uid);
    if (userToUpdate?.email.toLowerCase() === 'jhonatas.cadorin@gmail.com') {
       alert('O cargo do administrador mestre não pode ser alterado.');
       return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleUpdateStatus = async (uid: string, status: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status });
      if (selectedUser?.uid === uid) {
        setSelectedUser({ ...selectedUser, status });
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), editForm);
      setSelectedUser({ ...selectedUser, ...editForm });
      setIsEditing(false);
      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Error saving edits:', err);
      alert('Erro ao atualizar perfil.');
    }
  };

  const startEditing = () => {
    if (!selectedUser) return;
    setEditForm({
      name: selectedUser.name,
      phone: selectedUser.phone || '',
      status: selectedUser.status || 'active'
    });
    setIsEditing(true);
  };

  const handleUpdateSkills = async (uid: string, skills: TechnicalSkill[]) => {
    try {
      await updateDoc(doc(db, 'users', uid), { skills });
    } catch (err) {
      console.error('Error updating skills:', err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    const userToDelete = users.find(u => u.uid === uid);
    if (userToDelete?.email.toLowerCase() === 'jhonatas.cadorin@gmail.com') {
      alert('O administrador mestre não pode ser excluído do sistema.');
      return;
    }
    if (confirm('Deseja realmente remover este usuário do sistema?')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        if (selectedUser?.uid === uid) setSelectedUser(null);
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(false);

    try {
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      await setPersistence(secondaryAuth, browserLocalPersistence);

      let newUserUid = '';
      
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, regForm.email, regForm.password);
        const newUser = userCredential.user;
        newUserUid = newUser.uid;
        await sendEmailVerification(newUser);
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        console.error('Auth Creation Failed:', authErr);
        if (authErr.code === 'auth/operation-not-allowed') {
          newUserUid = `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        } else if (authErr.code === 'auth/network-request-failed') {
          throw new Error('Falha de rede ao conectar ao Firebase. Tente abrir o app em uma nova aba para evitar bloqueios do navegador no modo de visualização.');
        } else {
          throw authErr;
        }
      }

      await setDoc(doc(db, 'users', newUserUid), {
        uid: newUserUid,
        email: regForm.email,
        name: regForm.name,
        role: regForm.role,
        skills: regForm.skills,
        phone: regForm.phone,
        status: 'active',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      setRegSuccess(true);
      setRegForm({ name: '', email: '', password: '', role: 'tech', skills: [], phone: '' });
      
      if (newUserUid.startsWith('manual-')) {
        setRegError("Perfil salvo com sucesso para registro! NOTA: Este usuário não poderá logar pois o login por e-mail está desativado no seu painel Firebase.");
      } else {
        setRegError("Usuário criado com sucesso!");
      }

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setRegError('Este e-mail já está em uso.');
      else if (err.code === 'auth/weak-password') setRegError('A senha deve ter pelo menos 6 caracteres.');
      else setRegError('Erro ao criar usuário: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setRegLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status !== 'inactive').length,
    techs: users.filter(u => u.role === 'tech').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Usuários</h1>
          <p className="text-slate-500 font-medium">Gestão de colaboradores, acessos e especialidades físicas</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-6 py-3 bg-bento-blue-deep text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {showCreateForm ? <X size={18} /> : <UserPlus size={18} />}
          {showCreateForm ? 'Cancelar' : 'Cadastrar novo Colaborador'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
           { label: 'Total', value: stats.total, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
           { label: 'Ativos', value: stats.active, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
           { label: 'Técnicos', value: stats.techs, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
           { label: 'Admins', value: stats.admins, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
         ].map((m, i) => (
           <div key={i} className="bento-card flex flex-col justify-center items-center text-center">
              <div className={`p-3 ${m.bg} ${m.color} rounded-2xl mb-2`}>
                 <m.icon size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{m.label}</p>
              <p className="text-2xl font-black text-slate-900">{m.value}</p>
           </div>
         ))}
      </div>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bento-card mb-8">
               <div className="flex items-center gap-3 mb-8">
                  <UserPlus className="text-bento-accent" size={32} />
                  <div>
                     <h2 className="text-2xl font-display font-black uppercase tracking-tighter text-slate-900">Novo Cadastro</h2>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Crie contas para técnicos e líderes diretamente</p>
                  </div>
               </div>

               {regError && (
                 <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${
                   regSuccess ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'
                 }`}>
                   {regSuccess ? <Check className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                   <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{regError}</p>
                 </div>
               )}

               <form onSubmit={handleCreateUser} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</label>
                        <div className="relative">
                           <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                              type="text" 
                              required
                              value={regForm.name}
                              onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                              placeholder="Nome do colaborador"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Função no Sistema</label>
                        <select 
                           value={regForm.role}
                           onChange={(e) => setRegForm({...regForm, role: e.target.value as UserRole})}
                           className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold appearance-none"
                        >
                           {ROLES.map(role => (
                             <option key={role.value} value={role.value}>{role.label}</option>
                           ))}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail Corporativo</label>
                        <div className="relative">
                           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                              type="email" 
                              required
                              value={regForm.email}
                              onChange={(e) => setRegForm({...regForm, email: e.target.value})}
                              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                              placeholder="email@empresa.com"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone / WhatsApp</label>
                        <div className="relative">
                           <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                              type="text" 
                              value={regForm.phone}
                              onChange={(e) => setRegForm({...regForm, phone: e.target.value})}
                              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                              placeholder="(00) 00000-0000"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Senha Temporária</label>
                        <div className="relative">
                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                              type="password" 
                              required
                              value={regForm.password}
                              onChange={(e) => setRegForm({...regForm, password: e.target.value})}
                              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                              placeholder="Mínimo 6 caracteres"
                           />
                        </div>
                     </div>
                  </div>

                  {(regForm.role === 'tech' || regForm.role === 'user') && (
                    <div className="space-y-4 pt-4 border-t border-slate-50">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Wrench size={14} /> Vincule Especialidades
                       </h4>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest -mt-2">
                          Escolha quais tipos de manutenção este usuário poderá atender
                       </p>
                       
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {SKILLS.map((skill) => {
                            const isSelected = regForm.skills.includes(skill);
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => {
                                  const next = isSelected 
                                    ? regForm.skills.filter(s => s !== skill)
                                    : [...regForm.skills, skill];
                                  setRegForm({...regForm, skills: next});
                                }}
                                className={`flex items-center gap-2 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                  isSelected
                                    ? 'bg-bento-blue-deep text-white border-bento-blue-deep shadow-lg shadow-blue-900/10'
                                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                }`}
                              >
                                {skill}
                                {isSelected && <Check size={12} className="ml-auto" />}
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  )}

                  <div className="pt-6 flex justify-end">
                     <button
                        type="submit"
                        disabled={regLoading}
                        className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
                     >
                        {regLoading ? 'Processando...' : (
                          <>
                            <Save size={18} />
                            Finalizar Cadastro
                          </>
                        )}
                     </button>
                  </div>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold text-lg shadow-sm"
            />
          </div>
          <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm gap-1">
             {['all', 'admin', 'leader', 'tech', 'user'].map((f) => (
                <button
                  key={f}
                  onClick={() => setRoleFilter(f as any)}
                  className={`px-4 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    roleFilter === f 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {f === 'all' ? 'Todos' : ROLES.find(r => r.value === f)?.label}
                </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
             {loading ? (
               <div className="p-20 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bento-blue-deep mx-auto"></div>
               </div>
             ) : filteredUsers.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUsers.map((user) => {
                    const userRole = ROLES.find(r => r.value === user.role) || ROLES[3];
                    return (
                      <motion.div
                        layout
                        key={user.uid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedUser(user)}
                        className={`bento-card group cursor-pointer border-2 transition-all ${
                          selectedUser?.uid === user.uid ? 'border-bento-accent shadow-xl bg-white scale-[1.02]' : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-white transition-colors relative">
                            <UserCircle size={32} />
                            {user.status === 'inactive' && (
                               <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full" title="Inativo"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-black text-slate-800 truncate uppercase tracking-tight text-lg">
                              {user.name}
                            </h3>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mt-1 border ${userRole.color}`}>
                              <userRole.icon size={10} />
                              {userRole.label}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                           <div className="flex items-center gap-2 text-slate-400">
                              <Mail size={14} />
                              <span className="text-[10px] font-bold truncate max-w-[150px]">{user.email}</span>
                           </div>
                           {user.email.toLowerCase() !== 'jhonatas.cadorin@gmail.com' && (
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteUser(user.uid);
                               }}
                               className="p-2 hover:bg-red-50 text-slate-200 hover:text-red-500 rounded-xl transition-all"
                             >
                               <Trash2 size={16} />
                             </button>
                           )}
                        </div>
                      </motion.div>
                    );
                  })}
               </div>
             ) : (
               <div className="p-20 text-center bento-card opacity-40">
                  <Users size={48} className="mx-auto mb-4" />
                  <h3 className="text-xl font-display font-black uppercase tracking-tighter">Nenhum usuário encontrado</h3>
               </div>
             )}
          </div>

          <div className="lg:col-span-4 sticky top-6 self-start">
             <AnimatePresence mode="wait">
                {selectedUser ? (
                  <motion.div
                    key={selectedUser.uid}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bento-card !p-0 overflow-hidden shadow-2xl"
                  >
                    <div className="bg-slate-900 p-8 text-white">
                        <div className="flex justify-between items-start mb-6">
                           <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center relative">
                              <UserCircle size={40} />
                              {selectedUser.status === 'inactive' && (
                                 <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-slate-900 rounded-full"></div>
                              )}
                           </div>
                           <div className="flex gap-2">
                              {!isEditing && (
                                 <button 
                                    onClick={startEditing}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                                    title="Editar Perfil"
                                 >
                                    <Edit size={20} />
                                 </button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedUser(null);
                                  setIsEditing(false);
                                }}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                              >
                                <X size={24} />
                              </button>
                           </div>
                        </div>
                        {isEditing ? (
                           <div className="space-y-4">
                              <input 
                                 className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-white/40"
                                 value={editForm.name}
                                 onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                 placeholder="Nome completo"
                              />
                              <input 
                                 className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-white/40"
                                 value={editForm.phone}
                                 onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                 placeholder="Telefone"
                              />
                              <div className="flex gap-2 pt-2">
                                 <button 
                                    onClick={handleSaveEdit}
                                    className="flex-1 bg-white text-slate-900 font-bold py-2 rounded-xl text-xs uppercase"
                                 >
                                    Salvar
                                 </button>
                                 <button 
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-white/10 text-white font-bold py-2 rounded-xl text-xs uppercase"
                                 >
                                    Cancelar
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <>
                              <h2 className="text-3xl font-display font-black tracking-tighter uppercase leading-none">{selectedUser.name}</h2>
                              <p className="text-white/50 text-sm font-medium mt-2 flex items-center gap-2">
                                 <Mail size={14} /> {selectedUser.email}
                              </p>
                              {selectedUser.phone && (
                                 <p className="text-white/50 text-xs font-bold mt-1 flex items-center gap-2">
                                    <Phone size={12} /> {selectedUser.phone}
                                 </p>
                              )}
                           </>
                        )}
                    </div>

                    <div className="p-8 space-y-8">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                             <Activity size={14} /> Status da Conta
                          </h4>
                          <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                             <button
                                onClick={() => handleUpdateStatus(selectedUser.uid, 'active')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                   selectedUser.status !== 'inactive' 
                                   ? 'bg-emerald-600 text-white shadow-lg' 
                                   : 'text-slate-400 hover:bg-slate-100'
                                }`}
                             >
                                Ativo
                             </button>
                             <button
                                onClick={() => handleUpdateStatus(selectedUser.uid, 'inactive')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                   selectedUser.status === 'inactive' 
                                   ? 'bg-red-600 text-white shadow-lg' 
                                   : 'text-slate-400 hover:bg-slate-100'
                                }`}
                             >
                                Inativo
                             </button>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                             <Shield size={14} /> Definir Função de Acesso
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                             {ROLES.map((role) => (
                               <button
                                 key={role.value}
                                 onClick={() => handleUpdateRole(selectedUser.uid, role.value)}
                                 className={`flex items-center gap-2 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                   selectedUser.role === role.value 
                                     ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' 
                                     : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                 }`}
                               >
                                 <role.icon size={14} />
                                 {role.label}
                                 {selectedUser.role === role.value && <Check size={12} className="ml-auto" />}
                               </button>
                             ))}
                          </div>
                       </div>

                       {(selectedUser.role === 'tech' || selectedUser.role === 'user') && (
                          <div className="space-y-4 pt-4 border-t border-slate-50">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Wrench size={14} /> Especialidades Pessoais
                             </h4>
                             <div className="flex flex-wrap gap-2">
                                {SKILLS.map((skill) => {
                                  const isSelected = selectedUser.skills?.includes(skill);
                                  return (
                                    <button
                                      key={skill}
                                      onClick={() => {
                                        const current = selectedUser.skills || [];
                                        const next = isSelected 
                                          ? current.filter(s => s !== skill)
                                          : [...current, skill];
                                        handleUpdateSkills(selectedUser.uid, next);
                                      }}
                                      className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        isSelected
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                      }`}
                                    >
                                      {skill}
                                    </button>
                                  );
                                })}
                             </div>
                          </div>
                       )}

                       <div className="pt-6 border-t border-slate-50 space-y-3">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                             <span className="text-slate-400 flex items-center gap-2"><Calendar size={12} /> Membro desde</span>
                             <span className="text-slate-900">{new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bento-card flex flex-col items-center justify-center p-12 text-center space-y-4 border-4 border-dashed border-slate-100 text-slate-300 min-h-[400px]">
                     <UserCog size={64} className="opacity-20" />
                     <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">
                        Selecione um colaborador para<br />gerenciar acessos
                     </p>
                  </div>
                )}
             </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
