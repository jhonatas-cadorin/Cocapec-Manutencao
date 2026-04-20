import { useEffect, useState, FormEvent } from 'react';
import { collection, query, where, limit, orderBy, onSnapshot, doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ticket } from '../types';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Plus,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    completed: 0
  });

  useEffect(() => {
    // Test Connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test', 'initial'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // Recent Tickets
    const q = query(
      collection(db, 'tickets'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      setRecentTickets(tickets);
    });

    // Simple status counts (Ideally use a more efficient way or a cloud function, but for now snapshots)
    const qStats = query(collection(db, 'tickets'));
    const unsubscribeStats = onSnapshot(qStats, (snapshot) => {
      const tickets = snapshot.docs.map(doc => doc.data() as Ticket);
      setStats({
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
        completed: tickets.filter(t => t.status === 'completed').length
      });
      
      const cost = tickets.reduce((acc, t) => acc + (t.cost || 0), 0);
      setTotalCost(cost);
    });

    return () => {
      unsubscribe();
      unsubscribeStats();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter">COCAPEC Dashboard</h1>
          <p className="text-slate-500 font-medium">Gestão inteligente de manutenção predial</p>
        </div>
      </div>

      {/* Bento Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 auto-rows-[140px]">
        {/* Stats Cards */}
        <div className="bento-card">
           <div className="bento-card-header">Chamados Abertos</div>
           <div className="mt-auto">
              <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.open}</span>
              <p className="text-[10px] text-green-500 font-bold mt-1">↑ 12% vs. semana ant.</p>
           </div>
        </div>

        <div className="bento-card">
           <div className="bento-card-header">Tempo Médio</div>
           <div className="mt-auto">
              <span className="text-3xl font-black text-slate-800 tracking-tighter">3.2h</span>
              <p className="text-[10px] text-slate-400 font-bold mt-1">META: 4.0h</p>
           </div>
        </div>

        <div className="bento-card bg-emerald-50 border-emerald-100">
           <div className="bento-card-header text-emerald-800">Investimento</div>
           <div className="mt-auto">
              <span className="text-2xl font-black text-emerald-700 tracking-tighter">
                R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-tighter">Acumulado</p>
           </div>
        </div>

        <div className="bento-card">
           <div className="bento-card-header">Concluídos</div>
           <div className="mt-auto flex items-end justify-between">
              <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.completed}</span>
              <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
           </div>
        </div>

        {/* Inventory Quick View */}
        <div className="md:col-span-2 md:row-span-2 bento-card">
           <div className="bento-card-header">
              <span>Status de Ativos Críticos</span>
              <Link to="/inventory" className="text-[9px] bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200">VER TUDO</Link>
           </div>
           <div className="flex-1 space-y-4 mt-2">
              {[
                { name: 'Lâmpadas 20W', status: 'CRÍTICO', color: 'bg-red-500', width: '20%' },
                { name: 'Fita Isolante', status: 'OK', color: 'bg-green-500', width: '85%' },
                { name: 'Válvulas 1/2', status: 'BAIXO', color: 'bg-amber-500', width: '45%' },
                { name: 'Disjuntor 20A', status: 'OK', color: 'bg-green-500', width: '70%' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                   <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-600">{item.name}</span>
                      <span className={item.status === 'CRÍTICO' ? 'text-red-500' : 'text-slate-400'}>{item.status}</span>
                   </div>
                   <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: item.width }}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Priority tasks section (Takes up more space) */}
        <div className="md:col-span-2 md:row-span-3 bento-card">
           <div className="bento-card-header">
              <span>Chamados em Prioridade</span>
              <Link to="/tickets" className="text-[10px] text-bento-blue-deep">VER LISTA</Link>
           </div>
           <div className="space-y-1 divide-y divide-slate-50 overflow-y-auto no-scrollbar pr-1">
              {recentTickets.length > 0 ? (
                recentTickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className={`py-4 transition-colors flex justify-between items-start ${ticket.priority === 'high' || ticket.priority === 'critical' ? 'bento-priority-high' : 'bento-priority-med'} pl-3`}>
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-[13px] text-slate-800 truncate leading-tight uppercase tracking-tight">{ticket.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                        <span className="text-[9px] font-bold text-slate-500">ID: {ticket.id.slice(0,4)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <span className={`bento-status-pill ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                       </span>
                       <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Equipe Desp.</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center opacity-40">
                   <ClipboardList className="mx-auto mb-2" size={32} />
                   <p className="text-xs font-bold uppercase tracking-widest">Nenhuma tarefa</p>
                </div>
              )}
           </div>
        </div>

        {/* Mini Calendar View */}
        <div className="bento-card md:row-span-2">
           <div className="bento-card-header">Calendário</div>
           <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 mb-2">
              <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
           </div>
           <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-600">
              {Array.from({ length: 14 }).map((_, i) => {
                const day = i + 25;
                const isCurrent = day === 3; // Mocking today
                const color = isCurrent ? 'bg-bento-blue-deep text-white' : 'bg-slate-50 text-slate-300';
                return (
                  <div key={i} className={`aspect-square rounded flex items-center justify-center ${color}`}>
                    {day > 30 ? day - 30 : day}
                  </div>
                );
              })}
           </div>
           <div className="mt-4 pt-3 border-t border-slate-50">
              <div className="flex items-center gap-2 border-l-2 border-bento-accent pl-2">
                 <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-700 truncate leading-tight uppercase tracking-tight">Inspeção Preventiva</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-0.5">ADMINISTRATIVO</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Activity Summary / Quick Link */}
        <div className="bento-card flex-row justify-between items-center bg-slate-50 border-none group cursor-pointer hover:bg-slate-100 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Manutenções</p>
              <h4 className="font-display font-bold text-[14px] text-slate-900 group-hover:text-bento-blue-deep transition-colors">Corretivas</h4>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 group-hover:text-bento-blue-deep">
               <ArrowRight size={18} />
            </div>
        </div>

      </div>
    </div>
  );
}
