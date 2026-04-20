import { useEffect, useState, FormEvent } from 'react';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Team, AppUser, TechnicalSkill } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Trash2, 
  X, 
  UserPlus, 
  Shield, 
  Settings,
  Wrench,
  Droplet,
  Zap,
  Wind,
  Paintbrush,
  HardHat,
  Hammer
} from 'lucide-react';

const SKILLS: { id: TechnicalSkill; label: string; icon: any; color: string }[] = [
  { id: 'eletricista', label: 'Eletricista', icon: Zap, color: 'text-yellow-600 bg-yellow-50' },
  { id: 'encanador', label: 'Encanador', icon: Droplet, color: 'text-blue-600 bg-blue-50' },
  { id: 'hvac', label: 'Climatização', icon: Wind, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'pintor', label: 'Pintor', icon: Paintbrush, color: 'text-purple-600 bg-purple-50' },
  { id: 'pedreiro', label: 'Alvenaria', icon: Hammer, color: 'text-orange-600 bg-orange-50' },
  { id: 'limpeza', label: 'Limpeza', icon: HardHat, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'geral', label: 'Serviços Gerais', icon: Wrench, color: 'text-slate-600 bg-slate-50' },
];

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    leaderId: string;
    memberIds: string[];
    skills: TechnicalSkill[];
    description: string;
  }>({
    name: '',
    leaderId: '',
    memberIds: [],
    skills: [],
    description: '',
  });

  useEffect(() => {
    // Teams listener
    const qTeams = query(collection(db, 'teams'), orderBy('name', 'asc'));
    const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });

    // Users listener (to pick members/leaders)
    const qUsers = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser)));
    });

    return () => {
      unsubscribeTeams();
      unsubscribeUsers();
    };
  }, []);

  const openAddModal = () => {
    setEditingTeam(null);
    setFormData({ name: '', leaderId: '', memberIds: [], skills: [], description: '' });
    setShowAddModal(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      leaderId: team.leaderId,
      memberIds: team.memberIds,
      skills: team.skills,
      description: team.description || '',
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.leaderId || formData.memberIds.length === 0) {
      alert('Por favor, preencha o nome, líder e pelo menos um membro.');
      return;
    }
    
    setLoading(true);
    try {
      if (editingTeam) {
        await updateDoc(doc(db, 'teams', editingTeam.id), formData);
        alert('Equipe atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'teams'), formData);
        alert('Equipe criada com sucesso!');
      }
      setShowAddModal(false);
      setFormData({ name: '', leaderId: '', memberIds: [], skills: [], description: '' });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar equipe.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta equipe?')) {
      await deleteDoc(doc(db, 'teams', id));
    }
  };

  const toggleSkill = (skill: TechnicalSkill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill) 
        : [...prev.skills, skill]
    }));
  };

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId]
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Gestão de Equipes</h1>
          <p className="text-slate-500 font-medium">Organize times técnicos e suas especialidades</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-bento-blue-deep text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Criar Equipe</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((team) => (
          <motion.div
            key={team.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bento-card hover:border-bento-accent transition-all group"
          >
            <div className="bento-card-header">
               <span>Equipe Técnica</span>
               <div className="flex gap-2">
                 <button 
                   onClick={() => openEditModal(team)}
                   className="text-slate-300 hover:text-indigo-500 transition-colors"
                   title="Editar Equipe"
                 >
                    <Settings size={16} />
                 </button>
                 <button 
                   onClick={() => deleteTeam(team.id)} 
                   className="text-slate-300 hover:text-red-500 transition-colors"
                   title="Excluir Equipe"
                 >
                    <Trash2 size={16} />
                 </button>
               </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-tight uppercase group-hover:text-bento-blue-deep transition-colors">{team.name}</h3>
                <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-1">{team.description || 'Sem descrição'}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {team.skills.map(skillId => {
                  const skill = SKILLS.find(s => s.id === skillId);
                  if (!skill) return null;
                  return (
                    <span key={skillId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${skill.color}`}>
                       <skill.icon size={10} />
                       {skill.label}
                    </span>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-50">
                 <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-bento-accent" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Líder do Time</span>
                 </div>
                 <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-bento-blue-deep text-white flex items-center justify-center font-bold text-xs uppercase">
                       {users.find(u => u.uid === team.leaderId)?.name.charAt(0) || '?'}
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-700">{users.find(u => u.uid === team.leaderId)?.name || 'Desconhecido'}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gestor Técnico</p>
                    </div>
                 </div>
              </div>

              <div className="pt-2">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                       <Users size={12} />
                       Membros ({team.memberIds.length})
                    </span>
                 </div>
                 <div className="flex -space-x-2 overflow-hidden">
                    {team.memberIds.slice(0, 5).map(memberId => (
                       <div key={memberId} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase border border-white">
                          {users.find(u => u.uid === memberId)?.name.charAt(0) || 'M'}
                       </div>
                    ))}
                    {team.memberIds.length > 5 && (
                       <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-bento-accent/10 border border-white text-[10px] font-bold text-bento-accent">
                          +{team.memberIds.length - 5}
                       </div>
                    )}
                 </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
               <button className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                  Ver Atividade
               </button>
               <button className="flex-1 py-2 rounded-xl bg-bento-blue-deep text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-900/10 hover:brightness-110 transition-all">
                  Gerenciar
               </button>
            </div>
          </motion.div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-white/50 rounded-[40px] border-4 border-dashed border-slate-100">
             <Users size={48} className="mx-auto text-slate-200" />
             <div className="max-w-xs mx-auto">
                <p className="text-xl font-display font-black text-slate-400 uppercase tracking-tighter">Nenhuma Equipe</p>
                <p className="text-sm text-slate-400 mt-1">Crie grupos técnicos para começar a alocar os chamados de manutenção.</p>
             </div>
          </div>
        )}
      </div>

      {/* Add Team Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                   <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">
                     {editingTeam ? 'Editar Equipe' : 'Criar Nova Equipe'}
                   </h2>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Defina o nome, especialidades e membros do time.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           Nome da Equipe
                        </label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Ex: Equipe Alfa de Hidráulica"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                        />
                      </div>
 
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           Líder da Equipe
                        </label>
                        <select 
                          required
                          value={formData.leaderId}
                          onChange={(e) => setFormData({...formData, leaderId: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold appearance-none"
                        >
                          <option value="">Selecione um líder</option>
                          {users.filter(u => u.role !== 'user').map(u => (
                            <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>
 
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição/Objetivo</label>
                        <textarea 
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="Descreva as responsabilidades da equipe..."
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-medium resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Especialidades do Time</label>
                         <div className="grid grid-cols-1 gap-2">
                            {SKILLS.map((skill) => (
                               <button
                                 key={skill.id}
                                 type="button"
                                 onClick={() => toggleSkill(skill.id)}
                                 className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                                   formData.skills.includes(skill.id)
                                     ? 'bg-bento-blue-deep border-bento-blue-deep text-white shadow-lg shadow-blue-900/20'
                                     : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                 }`}
                               >
                                 <skill.icon size={18} className={formData.skills.includes(skill.id) ? 'text-bento-accent' : skill.color.split(' ')[0]} />
                                 <span className="text-xs font-bold uppercase tracking-wider">{skill.label}</span>
                               </button>
                            ))}
                         </div>
                      </div>
                    </div>
                  </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Membros da Equipe ({formData.memberIds.length} selecionados)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                         {users.filter(u => u.role !== 'user').map(u => (
                            <button
                              key={u.uid}
                              type="button"
                              onClick={() => toggleMember(u.uid)}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                formData.memberIds.includes(u.uid)
                                  ? 'bg-bento-accent/10 border-bento-accent text-bento-sidebar'
                                  : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                formData.memberIds.includes(u.uid) ? 'bg-bento-accent text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                 {u.name.charAt(0)}
                              </div>
                              <div className="text-left overflow-hidden">
                                 <p className="text-[11px] font-bold truncate">{u.name}</p>
                                 <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">{u.role}</p>
                              </div>
                            </button>
                         ))}
                      </div>
                   </div>
 
                   <div className="pt-6 flex gap-4">
                     <button 
                       type="button"
                       onClick={() => setShowAddModal(false)}
                       className="flex-1 py-5 px-6 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                     >
                       Cancelar
                     </button>
                     <button 
                       type="submit"
                       disabled={loading}
                       className="flex-[2] py-5 px-6 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                     >
                       {loading ? 'Processando...' : (editingTeam ? 'Salvar Alterações' : 'Finalizar Equipe')}
                     </button>
                   </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
