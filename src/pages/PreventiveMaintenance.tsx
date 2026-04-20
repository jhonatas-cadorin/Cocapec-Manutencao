import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PreventiveSchedule, Environment, FixedAsset, TicketPriority } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Plus, 
  X, 
  Search, 
  Settings2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  MapPin,
  Tag,
  Wrench
} from 'lucide-react';

export default function PreventiveMaintenance() {
  const [schedules, setSchedules] = useState<PreventiveSchedule[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [newSchedule, setNewSchedule] = useState<Omit<PreventiveSchedule, 'id'>>({
    title: '',
    description: '',
    environmentId: '',
    assetId: '',
    frequency: 'monthly',
    nextRun: new Date().toISOString().split('T')[0],
    priority: 'medium',
    isActive: true
  });

  useEffect(() => {
    // Schedules
    const unsubscribeSchedules = onSnapshot(collection(db, 'preventive_schedules'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreventiveSchedule)));
    });

    // Environments
    const unsubscribeEnv = onSnapshot(collection(db, 'environments'), (snapshot) => {
      setEnvironments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Environment)));
    });

    // Assets
    const unsubscribeAssets = onSnapshot(collection(db, 'fixed_assets'), (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedAsset)));
    });

    return () => {
      unsubscribeSchedules();
      unsubscribeEnv();
      unsubscribeAssets();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'preventive_schedules'), {
        ...newSchedule,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewSchedule({
        title: '',
        description: '',
        environmentId: '',
        assetId: '',
        frequency: 'monthly',
        nextRun: new Date().toISOString().split('T')[0],
        priority: 'medium',
        isActive: true
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'preventive_schedules', id), { isActive: !current });
  };

  const deleteSchedule = async (id: string) => {
    if (confirm('Deseja remover esta programação?')) {
      await deleteDoc(doc(db, 'preventive_schedules', id));
    }
  };

  const frequencies = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Preventivas</h1>
          <p className="text-slate-500 font-medium">Cronograma de manutenções programadas</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={20} />
          <span>Nova Programação</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar preventivas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((schedule) => {
          const env = environments.find(e => e.id === schedule.environmentId);
          const asset = assets.find(a => a.id === schedule.assetId);
          
          return (
            <motion.div
              layout
              key={schedule.id}
              className={`bento-card border-2 transition-all ${
                schedule.isActive ? 'border-transparent' : 'border-slate-100 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${schedule.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Calendar size={20} />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleStatus(schedule.id, schedule.isActive)}
                    className={`p-2 rounded-lg transition-all ${
                      schedule.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {schedule.isActive ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                  </button>
                  <button onClick={() => deleteSchedule(schedule.id)} className="p-2 text-slate-200 hover:text-red-500 transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight line-clamp-1">{schedule.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mt-1">{schedule.frequency}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">{env?.name || 'Local não definido'}</span>
                  </div>
                  {asset && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Tag size={14} className="shrink-0" />
                      <span className="truncate">{asset.name} [{asset.tagCode}]</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Próxima Execução</span>
                    <span className="text-sm font-black text-slate-800 mt-1">{new Date(schedule.nextRun).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white`}>
                    {schedule.priority}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

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
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">Nova Preventiva</h2>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Defina tarefas recorrentes para evitar quebras.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Título da Tarefa</label>
                  <input 
                    required
                    type="text" 
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                    placeholder="Ex: Troca de filtros do Ar Condicionado"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frequência</label>
                    <select 
                      value={newSchedule.frequency}
                      onChange={(e) => setNewSchedule({...newSchedule, frequency: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold appearance-none"
                    >
                      {frequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prioridade</label>
                    <select 
                      value={newSchedule.priority}
                      onChange={(e) => setNewSchedule({...newSchedule, priority: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold appearance-none"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ambiente Alvo</label>
                  <select 
                    required
                    value={newSchedule.environmentId}
                    onChange={(e) => setNewSchedule({...newSchedule, environmentId: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="">Selecione o ambiente</option>
                    {environments.map(env => (
                      <option key={env.id} value={env.id}>{env.name} ({env.building})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipamento Específico (Opcional)</label>
                  <select 
                    value={newSchedule.assetId}
                    onChange={(e) => setNewSchedule({...newSchedule, assetId: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="">Nenhum equipamento vinculado</option>
                    {assets
                      .filter(a => !newSchedule.environmentId || a.environmentId === newSchedule.environmentId)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>[{asset.tagCode}] {asset.name}</option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primeira Execução em</label>
                  <input 
                    required
                    type="date" 
                    value={newSchedule.nextRun}
                    onChange={(e) => setNewSchedule({...newSchedule, nextRun: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold"
                  />
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
                    className="flex-[2] py-5 px-6 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {loading ? 'Salvando...' : 'Criar Programação'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
