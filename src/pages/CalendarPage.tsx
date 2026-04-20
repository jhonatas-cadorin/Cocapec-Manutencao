import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Ticket, Environment, Team, TicketType, TicketPriority, TechnicalSkill, FixedAsset } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  X,
  Plus,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notifyUser } from '../services/notificationService';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Form State
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    environmentId: '',
    type: 'corrective' as TicketType,
    priority: 'medium' as TicketPriority,
    requiredSkill: '' as TechnicalSkill | '',
    assignedTeamId: '',
    imageUrl: '',
    assetId: ''
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

    // Assets
    const qAssets = query(collection(db, 'fixed_assets'), orderBy('name', 'asc'));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedAsset)));
    });

    return () => {
      unsubscribe();
      unsubscribeEnv();
      unsubscribeTeams();
      unsubscribeAssets();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedDay) return;
    setLoading(true);
    try {
      // Use the selected day for the creation date
      const creationDate = new Date(selectedDay);
      // Set to current time but selected day
      const now = new Date();
      creationDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      await addDoc(collection(db, 'tickets'), {
        ...newTicket,
        status: newTicket.assignedTeamId ? 'assigned' : 'open',
        requesterId: auth.currentUser.uid,
        createdAt: creationDate.toISOString(),
        updatedAt: creationDate.toISOString(),
        timestamp: serverTimestamp()
      });

      // Simple notification
      if (newTicket.assignedTeamId) {
        const team = teams.find(t => t.id === newTicket.assignedTeamId);
        if (team) {
          const leaderSnap = await getDoc(doc(db, 'users', team.leaderId));
          if (leaderSnap.exists()) {
             await notifyUser(
               { uid: leaderSnap.id, ...leaderSnap.data() } as any, 
               'assignment', 
               'Novo Chamado (Calendário)', 
               `Equipe escalada para o dia ${format(selectedDay, 'dd/MM')}`
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
        assignedTeamId: '',
        imageUrl: '',
        assetId: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setShowNewModal(true);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getTicketsForDay = (day: Date) => {
    return tickets.filter(ticket => isSameDay(new Date(ticket.createdAt), day));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Calendário</h1>
          <p className="text-gray-500 mt-1">Acompanhamento de prazos e manutenções preventivas.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold min-w-[120px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="py-4 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayTickets = getTicketsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={idx} 
                onClick={() => handleDayClick(day)}
                className={`min-h-[120px] p-2 border-r border-b border-gray-100 flex flex-col gap-1 transition-all cursor-pointer hover:bg-slate-50 group/day ${
                  !isCurrentMonth ? 'bg-gray-50/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <Plus size={14} className="text-slate-200 group-hover/day:text-blue-500 transition-colors" />
                </div>
                
                <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                  {dayTickets.map(ticket => (
                    <div 
                      key={ticket.id}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold truncate ${
                        ticket.type === 'preventive' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-orange-50 text-orange-700 border border-orange-100'
                      }`}
                    >
                      {ticket.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 p-6 bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manutenção Corretiva</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manutenção Preventiva</span>
        </div>
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewModal && selectedDay && (
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
                  <h2 className="text-2xl font-bold">Agendar: {format(selectedDay, 'dd/MM/yyyy')}</h2>
                  <p className="text-blue-100 text-sm">Abra um chamado para este dia específico.</p>
                </div>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Título do chamado</label>
                  <input 
                    required
                    type="text" 
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                    placeholder="Ex: Preventiva Ar Condicionado"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Ambiente</label>
                    <select 
                      required
                      value={newTicket.environmentId}
                      onChange={(e) => setNewTicket({...newTicket, environmentId: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none font-bold text-xs"
                    >
                      <option value="">Selecione...</option>
                      {environments.map(env => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Tipo</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setNewTicket({...newTicket, type: 'corrective'})}
                        className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                          newTicket.type === 'corrective' 
                            ? 'border-blue-600 bg-blue-50 text-blue-600' 
                            : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <AlertTriangle size={16} />
                        <span className="font-bold text-[10px] uppercase">Corretiva</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewTicket({...newTicket, type: 'preventive'})}
                        className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                          newTicket.type === 'preventive' 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-600' 
                            : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <Info size={16} />
                        <span className="font-bold text-[10px] uppercase">Preventiva</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Patrimônio / Placa de Identificação</label>
                  <select 
                    value={newTicket.assetId}
                    onChange={(e) => setNewTicket({...newTicket, assetId: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none font-bold text-xs"
                  >
                    <option value="">Nenhum patrimônio específico</option>
                    {assets
                      .filter(a => !newTicket.environmentId || a.environmentId === newTicket.environmentId)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>Placa: {asset.tagCode} — {asset.name}</option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipe Resp.</label>
                    <select 
                      value={newTicket.assignedTeamId}
                      onChange={(e) => setNewTicket({...newTicket, assignedTeamId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold appearance-none text-xs"
                    >
                      <option value="">Automática</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prioridade</label>
                    <select 
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({...newTicket, priority: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold appearance-none text-xs"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Descrição</label>
                  <textarea 
                    required
                    rows={3}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    placeholder="Descreva a atividade..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm font-medium"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Agendar Manutenção'}
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
