import { useEffect, useState, FormEvent } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { Ticket, Environment, TicketType, TicketPriority, Team, TechnicalSkill, AppUser } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { notifyUser } from '../services/notificationService';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  X,
  AlertTriangle,
  Info,
  Users,
  Wrench
} from 'lucide-react';

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [technicians, setTechnicians] = useState<AppUser[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Advanced Filters State
  const [filters, setFilters] = useState({
    status: '' as string,
    priority: '' as string,
    teamId: '' as string,
    type: '' as string,
    assignedToId: '' as string,
  });
  
  // Form State
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    environmentId: searchParams.get('env') || '',
    type: 'corrective' as TicketType,
    priority: 'medium' as TicketPriority,
    requiredSkill: '' as TechnicalSkill | '',
    assignedTeamId: ''
  });

  useEffect(() => {
    // Tickets
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
    });

    // Environments
    const qEnv = query(collection(db, 'environments'), orderBy('name', 'asc'));
    const unsubscribeEnv = onSnapshot(qEnv, (snapshot) => {
      setEnvironments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Environment)));
    });

    // Teams
    const qTeams = query(collection(db, 'teams'), orderBy('name', 'asc'));
    const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });

    // Technicians (users who can be assigned)
    const qTechs = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribeTechs = onSnapshot(qTechs, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
      const staff = allUsers.filter(u => ['tech', 'leader', 'admin'].includes(u.role));
      setTechnicians(staff);
    });

    if (searchParams.get('env')) {
      setShowNewModal(true);
    }

    return () => {
      unsubscribe();
      unsubscribeEnv();
      unsubscribeTeams();
      unsubscribeTechs();
    };
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const ticketDoc = await addDoc(collection(db, 'tickets'), {
        ...newTicket,
        status: newTicket.assignedTeamId ? 'assigned' : 'open',
        requesterId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      // Notification logic
      if (newTicket.assignedTeamId) {
        const team = teams.find(t => t.id === newTicket.assignedTeamId);
        if (team) {
          // Notify team leader
          const leaderSnap = await getDoc(doc(db, 'users', team.leaderId));
          if (leaderSnap.exists()) {
             const leaderData = { uid: leaderSnap.id, ...leaderSnap.data() } as AppUser;
             await notifyUser(
               leaderData, 
               'assignment', 
               'Novo Chamado Atribuído', 
               `O chamado "${newTicket.title}" foi atribuído à sua equipe.`
             );
          }
        }
      }

      setShowNewModal(false);
      setNewTicket({
        title: '',
        description: '',
        environmentId: '',
        type: 'corrective',
        priority: 'medium',
        requiredSkill: '',
        assignedTeamId: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      open: 'bg-yellow-100 text-yellow-700',
      assigned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority: string) => {
    const classes = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      critical: 'bg-red-100 text-red-600'
    };
    return classes[priority as keyof typeof classes] || 'bg-gray-100 text-gray-700';
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.slice(0, 8).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filters.status || ticket.status === filters.status;
    const matchesPriority = !filters.priority || ticket.priority === filters.priority;
    const matchesTeam = !filters.teamId || ticket.assignedTeamId === filters.teamId;
    const matchesType = !filters.type || ticket.type === filters.type;
    const matchesTechnician = !filters.assignedToId || ticket.assignedToId === filters.assignedToId;

    return matchesSearch && matchesStatus && matchesPriority && matchesTeam && matchesType && matchesTechnician;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Chamados</h1>
          <p className="text-slate-500 font-medium">Gestão de solicitações e ordens de serviço</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="flex items-center justify-center gap-2 bg-bento-blue-deep text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Chamado</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar por título, descrição ou ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 border px-6 py-3 rounded-2xl font-semibold transition-all shadow-sm ${
            showFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter size={20} />
          <span>{showFilters ? 'Fechar Filtros' : 'Filtrar'}</span>
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-2 lg:grid-cols-5 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bento-accent/10 outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="open">Aberto</option>
                    <option value="assigned">Atribuído</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prioridade</label>
                  <select 
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bento-accent/10 outline-none"
                  >
                    <option value="">Todas</option>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipe</label>
                  <select 
                    value={filters.teamId}
                    onChange={(e) => setFilters({...filters, teamId: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bento-accent/10 outline-none"
                  >
                    <option value="">Todas</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Técnico</label>
                  <select 
                    value={filters.assignedToId}
                    onChange={(e) => setFilters({...filters, assignedToId: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bento-accent/10 outline-none"
                  >
                    <option value="">Todos</option>
                    {technicians.map(tech => (
                      <option key={tech.uid} value={tech.uid}>{tech.name}</option>
                    ))}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bento-accent/10 outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="corrective">Corretiva</option>
                    <option value="preventive">Preventiva</option>
                  </select>
               </div>
               <div className="col-span-full pt-2">
                  <button 
                    onClick={() => setFilters({ status: '', priority: '', teamId: '', type: '', assignedToId: '' })}
                    className="text-[10px] font-black uppercase tracking-widest text-bento-accent hover:underline"
                  >
                    Limpar Filtros
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map((ticket) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group ${
              ticket.priority === 'critical' 
                ? 'bg-red-50/30 border-red-500 border-2 shadow-xl shadow-red-500/10 ring-4 ring-red-500/5' 
                : 'bg-white border-gray-200 shadow-sm hover:border-blue-300'
            }`}
          >
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full ${getStatusBadge(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full ${getPriorityBadge(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                {ticket.priority === 'critical' && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-red-600 animate-pulse">
                    <AlertTriangle size={12} />
                    Alta Urgência
                  </span>
                )}
                <span className="text-xs text-gray-400 font-medium tracking-tight">#{ticket.id.slice(0, 6)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className={`text-xl font-bold group-hover:text-blue-600 transition-colors uppercase tracking-tight ${
                    ticket.priority === 'critical' ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {ticket.title}
                  </h3>
                </div>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2 leading-relaxed">{ticket.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pt-2">
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                  <span className="text-gray-400">Ambiente:</span>
                  <span className="font-semibold text-gray-700">{environments.find(e => e.id === ticket.environmentId)?.name || 'Ambiente Externo'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Criado em:</span>
                  <span className="font-medium">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
            <button className="p-3 rounded-2xl bg-gray-100 text-gray-400 hover:bg-blue-600 hover:text-white transition-all group-hover:scale-105 active:scale-95">
              <ChevronRight size={24} />
            </button>
          </motion.div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto">
              <ClipboardList size={32} />
            </div>
            <div className="max-w-xs mx-auto">
              <p className="text-lg font-bold text-gray-900">Nenhum chamado</p>
              <p className="text-sm text-gray-500">
                {searchTerm || filters.status || filters.priority || filters.teamId || filters.type || filters.assignedToId
                  ? 'Nenhum resultado para os filtros aplicados.' 
                  : 'Comece abrindo um novo chamado clicando no botão acima ou escaneando um QR Code.'}
              </p>
              {(searchTerm || filters.status || filters.priority || filters.teamId || filters.type || filters.assignedToId) && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ status: '', priority: '', teamId: '', type: '', assignedToId: '' });
                  }}
                  className="mt-4 text-blue-600 font-bold text-sm underline"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
                <div>
                  <h2 className="text-2xl font-bold">Novo Chamado</h2>
                  <p className="text-blue-100 text-sm">Preencha os detalhes da solicitação.</p>
                </div>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Título do Problema</label>
                  <input 
                    required
                    type="text" 
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                    placeholder="Ex: Ar condicionado não gela"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Ambiente</label>
                    <select 
                      required
                      value={newTicket.environmentId}
                      onChange={(e) => setNewTicket({...newTicket, environmentId: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                    >
                      <option value="">Selecione o ambiente</option>
                      {environments.map(env => (
                        <option key={env.id} value={env.id}>{env.name} - {env.building}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Prioridade</label>
                    <select 
                      required
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({...newTicket, priority: e.target.value as TicketPriority})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Manutenção</label>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setNewTicket({...newTicket, type: 'corrective'})}
                      className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                        newTicket.type === 'corrective' 
                          ? 'border-bento-blue-deep bg-blue-50 text-bento-blue-deep' 
                          : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <AlertTriangle size={20} />
                      <span className="font-bold text-sm">Corretiva</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewTicket({...newTicket, type: 'preventive'})}
                      className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                        newTicket.type === 'preventive' 
                          ? 'border-bento-blue-deep bg-blue-50 text-bento-blue-deep' 
                          : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <Info size={20} />
                      <span className="font-bold text-sm">Preventiva</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Especialidade</label>
                    <select 
                      value={newTicket.requiredSkill}
                      onChange={(e) => setNewTicket({...newTicket, requiredSkill: e.target.value as TechnicalSkill})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold appearance-none"
                    >
                      <option value="">Não especificado</option>
                      <option value="eletricista">Eletricidade</option>
                      <option value="encanador">Hidráulica</option>
                      <option value="hvac">Climatização</option>
                      <option value="pintor">Pintura</option>
                      <option value="pedreiro">Alvenaria</option>
                      <option value="limpeza">Limpeza</option>
                      <option value="geral">Geral</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipe Resp.</label>
                    <select 
                      value={newTicket.assignedTeamId}
                      onChange={(e) => setNewTicket({...newTicket, assignedTeamId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold appearance-none"
                    >
                      <option value="">Alocação Automática</option>
                      {teams
                        .filter(t => !newTicket.requiredSkill || t.skills.includes(newTicket.requiredSkill as TechnicalSkill))
                        .map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Descrição Detalhada</label>
                  <textarea 
                    required
                    rows={4}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    placeholder="Descreva o que está acontecendo..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {loading ? 'Enviando...' : 'Criar Chamado'}
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
