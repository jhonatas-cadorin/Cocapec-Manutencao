import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ticket } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { motion } from 'framer-motion';
import { Download, Filter, TrendingUp, Users, Package as PackageIcon, CheckCircle2, Clock, UserPlus, PlayCircle } from 'lucide-react';

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [roadmapStats, setRoadmapStats] = useState({
    open: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'tickets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Ticket);
      setTickets(data);

      // Process Roadmap Stats
      setRoadmapStats({
        open: data.filter(t => t.status === 'open').length,
        assigned: data.filter(t => t.status === 'assigned').length,
        in_progress: data.filter(t => t.status === 'in_progress').length,
        completed: data.filter(t => t.status === 'completed').length
      });

      // Process Total Cost
      const cost = data.reduce((acc, t) => acc + (t.cost || 0), 0);
      setTotalCost(cost);

      // Process Type Data
      const types = { 
        corrective: data.filter(t => t.type === 'corrective').length,
        preventive: data.filter(t => t.type === 'preventive').length
      };
      setTypeData([
        { name: 'Corretiva', value: types.corrective },
        { name: 'Preventiva', value: types.preventive }
      ]);

      // Process Status Data
      const statuses = {
        open: data.filter(t => t.status === 'open').length,
        in_progress: data.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
        completed: data.filter(t => t.status === 'completed').length,
        cancelled: data.filter(t => t.status === 'cancelled').length,
      };
      setStatusData([
        { name: 'Aberto', value: statuses.open },
        { name: 'Execução', value: statuses.in_progress },
        { name: 'Concluído', value: statuses.completed },
        { name: 'Cancelado', value: statuses.cancelled },
      ]);

      // Process Trend Data (Last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const trends = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count: data.filter(t => t.createdAt.startsWith(date)).length
      }));
      setTrendData(trends);
    });

    return () => unsubscribe();
  }, []);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];

  const exportCSV = () => {
    if (tickets.length === 0) return;
    const headers = ['ID', 'Título', 'Tipo', 'Prioridade', 'Status', 'Data Criado'];
    const rows = tickets.map(t => [
      t.id, 
      t.title, 
      t.type, 
      t.priority, 
      t.status, 
      new Date(t.createdAt).toLocaleDateString('pt-BR')
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_manutencao.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Painel Analítico</h1>
          <p className="text-slate-500 font-medium">Métricas e tendências de performance operacional</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 bg-bento-blue-deep text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 h-fit"
          >
            <Download size={18} />
            <span className="text-sm">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Roadmap / Progress Lifecycle */}
      <div className="bento-card overflow-hidden">
        <div className="bento-card-header">Jornada do Chamado</div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2">
          {/* Step 1: Open */}
          <div className="flex-1 flex flex-col items-center text-center group w-full md:w-auto">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm transition-transform group-hover:scale-110 mb-2">
                <Clock size={20} />
              </div>
              <div className="hidden md:block absolute left-1/2 ml-8 w-full h-[2px] bg-slate-100 -z-10 mt-[-8px]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendente</span>
            <span className="text-lg font-bold text-slate-800">{roadmapStats.open}</span>
            <p className="text-[9px] text-slate-500 font-medium">Aguardando Triagem</p>
          </div>

          {/* Step 2: Assigned */}
          <div className="flex-1 flex flex-col items-center text-center group w-full md:w-auto">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm transition-transform group-hover:scale-110 mb-2">
                <UserPlus size={20} />
              </div>
              <div className="hidden md:block absolute left-1/2 ml-8 w-full h-[2px] bg-slate-100 -z-10 mt-[-8px]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atribuído</span>
            <span className="text-lg font-bold text-slate-800">{roadmapStats.assigned}</span>
            <p className="text-[9px] text-slate-500 font-medium">Técnico Vinculado</p>
          </div>

          {/* Step 3: In Progress */}
          <div className="flex-1 flex flex-col items-center text-center group w-full md:w-auto">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:scale-110 mb-2">
                <PlayCircle size={20} />
              </div>
              <div className="hidden md:block absolute left-1/2 ml-8 w-full h-[2px] bg-slate-100 -z-10 mt-[-8px]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execução</span>
            <span className="text-lg font-bold text-slate-800">{roadmapStats.in_progress}</span>
            <p className="text-[9px] text-slate-500 font-medium">Serviço em Andamento</p>
          </div>

          {/* Step 4: Completed */}
          <div className="flex-1 flex flex-col items-center text-center group w-full md:w-auto">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm transition-transform group-hover:scale-110 mb-2">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Concluído</span>
            <span className="text-lg font-bold text-slate-800">{roadmapStats.completed}</span>
            <p className="text-[9px] text-slate-500 font-medium">Encerrado e Validado</p>
          </div>
        </div>
      </div>

      {/* Bento Grid layout for Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[minmax(120px,auto)]">
        {/* Metric Cards - Highlights */}
        {[
          { label: 'Total Chamados', value: tickets.length, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { 
            label: 'Investimento Total', 
            value: `R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
            icon: CheckCircle2, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50' 
          },
          { label: 'Equipe Ativa', value: '12', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Ativos Críticos', value: '3', icon: PackageIcon, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((metric, idx) => (
          <div key={idx} className="bento-card justify-center">
            <div className="bento-card-header">{metric.label}</div>
            <div className="flex items-end justify-between mt-1">
               <div className="text-3xl font-black text-slate-800 tracking-tighter">{metric.value}</div>
               <div className={`p-2 ${metric.bg} ${metric.color} rounded-lg`}>
                  <metric.icon size={16} />
               </div>
            </div>
          </div>
        ))}

        {/* Weekly Trend - Mid Width, High Row Span */}
        <div className="md:col-span-3 md:row-span-3 bento-card">
          <div className="bento-card-header">
             <span>Fluxo de Chamados Semanal</span>
             <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Atividade Crescente</span>
          </div>
          <div className="flex-1 h-full min-h-[300px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#1e3a8a" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution - Large Side Card */}
        <div className="md:col-span-1 md:row-span-3 bento-card bg-slate-900 border-none text-white overflow-hidden">
          <div className="bento-card-header text-white/50">Categorias</div>
          <h3 className="text-lg font-display font-bold mb-4 uppercase tracking-tight">Variação de Tipo</h3>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#38bdf8' : '#1e40af'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', color: '#111' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-2xl font-black">{tickets.length}</span>
               <span className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            {typeData.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: idx === 0 ? '#38bdf8' : '#1e40af' }}></div>
                   <span className="text-[11px] font-bold tracking-tight uppercase">{entry.name}</span>
                </div>
                <span className="text-sm font-black text-bento-accent">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution - Wide Bottom Card */}
        <div className="md:col-span-4 md:row-span-2 bento-card">
          <div className="bento-card-header">Status da Operação</div>
          <div className="flex-1 min-h-[200px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar 
                  dataKey="value" 
                  fill="#1e3a8a" 
                  radius={[10, 10, 0, 0]} 
                  barSize={60} 
                >
                   {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 2 ? '#10b981' : index === 0 ? '#f59e0b' : '#3b82f6'} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
