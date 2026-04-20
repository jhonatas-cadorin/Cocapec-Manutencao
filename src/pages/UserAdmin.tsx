import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  Award
} from 'lucide-react';

const ROLES: { value: UserRole; label: string; color: string; icon: any }[] = [
  { value: 'admin', label: 'Admin', color: 'text-purple-600 bg-purple-50 border-purple-100', icon: Shield },
  { value: 'leader', label: 'Líder', color: 'text-bento-accent bg-amber-50 border-amber-100', icon: Award },
  { value: 'tech', label: 'Técnico', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Wrench },
  { value: 'user', label: 'Usuário', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: Users },
];

const SKILLS: TechnicalSkill[] = ['eletricista', 'encanador', 'hvac', 'pintor', 'pedreiro', 'limpeza', 'geral'];

export default function UserAdmin() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as AppUser)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleUpdateSkills = async (uid: string, skills: TechnicalSkill[]) => {
    try {
      await updateDoc(doc(db, 'users', uid), { skills });
    } catch (err) {
      console.error('Error updating skills:', err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (confirm('Deseja realmente remover este usuário do sistema?')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        if (selectedUser?.uid === uid) setSelectedUser(null);
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Gestão de Usuários</h1>
          <p className="text-slate-500 font-medium">Controle de acessos, funções e habilidades técnicas</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm font-bold text-xs text-slate-500 uppercase tracking-widest">
           <Users size={14} />
           <span>{users.length} Registrados</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold text-lg shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User List */}
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
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-white transition-colors">
                          <UserCircle size={32} />
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
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeleteUser(user.uid);
                           }}
                           className="p-2 hover:bg-red-50 text-slate-200 hover:text-red-500 rounded-xl transition-all"
                         >
                           <Trash2 size={16} />
                         </button>
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

        {/* User Details Sidebar */}
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
                        <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                           <UserCircle size={40} />
                        </div>
                        <button 
                          onClick={() => setSelectedUser(null)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                          <X size={24} />
                        </button>
                     </div>
                     <h2 className="text-3xl font-display font-black tracking-tighter uppercase leading-none">{selectedUser.name}</h2>
                     <p className="text-white/50 text-sm font-medium mt-2 flex items-center gap-2">
                        <Mail size={14} /> {selectedUser.email}
                     </p>
                  </div>

                  <div className="p-8 space-y-8">
                     {/* Role Management */}
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

                     {/* Skills Management (only for tech) */}
                     {selectedUser.role === 'tech' && (
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <Wrench size={14} /> Habilidades Técnicas
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

                     {/* Stats/Info */}
                     <div className="pt-6 border-t border-slate-50 space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                           <span className="text-slate-400 flex items-center gap-2"><Calendar size={12} /> Membro desde</span>
                           <span className="text-slate-900">{new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                           <span className="text-slate-400 flex items-center gap-2"><UserCog size={12} /> ID Único</span>
                           <span className="text-slate-400 font-mono tracking-tighter">{selectedUser.uid.slice(0, 8)}...</span>
                        </div>
                     </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bento-card flex flex-col items-center justify-center p-12 text-center space-y-4 border-4 border-dashed border-slate-100 text-slate-300 min-h-[400px]">
                   <UserCog size={64} className="opacity-20" />
                   <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">
                      Selecione um usuário para<br />gerenciar permissões
                   </p>
                </div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
