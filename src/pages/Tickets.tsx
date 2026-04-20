import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { Ticket, Environment, TicketType, TicketPriority, Team, TechnicalSkill, AppUser, FixedAsset } from '../types';
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
  Wrench,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  MapPin,
  Camera,
  Image as ImageIcon,
  Share2,
  Zap,
  Package,
  FileText
} from 'lucide-react';
import { updateDoc, increment } from 'firebase/firestore';
import SignaturePad from '../components/SignaturePad';
import { InventoryItem } from '../types';

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [technicians, setTechnicians] = useState<AppUser[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Completion form state
  const [completionCost, setCompletionCost] = useState<string>('');
  const [completionNote, setCompletionNote] = useState<string>('');
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [usedInventoryItems, setUsedInventoryItems] = useState<{ itemId: string; name: string; quantity: number; cost: number }[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

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
    assignedTeamId: '',
    imageUrl: '',
    assetId: ''
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        alert('A imagem é muito grande. Máximo 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTicket({ ...newTicket, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

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

    // Assets
    const qAssets = query(collection(db, 'fixed_assets'), orderBy('name', 'asc'));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedAsset)));
    });

    // Inventory
    const qInv = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
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
      unsubscribeAssets();
      unsubscribeInv();
      unsubscribeTeams();
      unsubscribeTechs();
    };
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'tickets'), {
        ...newTicket,
        status: newTicket.assignedTeamId ? 'assigned' : 'open',
        requesterId: auth.currentUser.uid,
        createdAt: now,
        updatedAt: now,
        timestamp: serverTimestamp()
      });

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
    } catch (err: any) {
      console.error('Error saving ticket:', err);
      setErrorMsg(err.message || 'Erro desconhecido ao salvar o chamado.');
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

  const handleCompleteTicket = async (signatureUrl?: string) => {
    if (!selectedTicket) return;
    setIsCompleting(true);
    try {
      const totalInventoryCost = usedInventoryItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
      const totalFinalCost = (parseFloat(completionCost) || 0) + totalInventoryCost;

      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        status: 'completed',
        cost: totalFinalCost,
        afterImages: afterImages,
        signatureUrl: signatureUrl || null,
        usedItems: usedInventoryItems,
        completionNote: completionNote,
        completionDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update Inventory Quantities
      for (const item of usedInventoryItems) {
        const itemRef = doc(db, 'inventory', item.itemId);
        await updateDoc(itemRef, {
          quantity: increment(-item.quantity)
        });
      }

      setSelectedTicket(null);
      setCompletionCost('');
      setUsedInventoryItems([]);
      setAfterImages([]);
      setCompletionNote('');
      setShowSignature(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleAfterFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert('A imagem é muito grande. Máximo 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterImages([...afterImages, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const addInventoryItem = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const existing = usedInventoryItems.find(i => i.itemId === itemId);
    if (existing) {
      setUsedInventoryItems(usedInventoryItems.map(i => 
        i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setUsedInventoryItems([...usedInventoryItems, { 
        itemId, 
        name: item.name, 
        quantity: 1, 
        cost: item.unitCost || 0 
      }]);
    }
  };

  const shareToWhatsApp = (ticket: Ticket) => {
    const envName = environments.find(e => e.id === ticket.environmentId)?.name || 'Ambiente Externo';
    const text = `*Chamado de Manutenção #${ticket.id.slice(0, 8)}*\n\n` +
      `*Título:* ${ticket.title}\n` +
      `*Status:* ${ticket.status}\n` +
      `*Prioridade:* ${ticket.priority}\n` +
      `*Local:* ${envName}\n` +
      `*Descrição:* ${ticket.description}\n\n` +
      `_COCAPEC Manutenção Predial_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

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
        <AnimatePresence mode="popLayout">
          {filteredTickets.map((ticket) => (
            <motion.div
              key={ticket.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
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
                {ticket.cost !== undefined && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <DollarSign size={14} />
                    <span>R$ {ticket.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => setSelectedTicket(ticket)}
              className="p-3 rounded-2xl bg-gray-100 text-gray-400 hover:bg-blue-600 hover:text-white transition-all group-hover:scale-105 active:scale-95"
            >
              <ChevronRight size={24} />
            </button>
          </motion.div>
        ))}
        </AnimatePresence>

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

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${getStatusBadge(selectedTicket.status)}`}>
                             {selectedTicket.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{selectedTicket.id.slice(0, 8)}</span>
                       </div>
                       <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">{selectedTicket.title}</h2>
                    </div>
                    <button 
                      onClick={() => shareToWhatsApp(selectedTicket)}
                      className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all ml-2"
                      title="Compartilhar via WhatsApp"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400">
                    <X size={24} />
                  </button>
                </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <MessageSquare size={12} />
                            Descrição do Problema
                         </label>
                         <p className="text-sm text-slate-600 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 italic leading-relaxed">
                            {selectedTicket.description}
                         </p>
                      </div>

                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                               <MapPin size={20} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Localização</p>
                               <p className="text-sm font-bold text-slate-700">
                                  {environments.find(e => e.id === selectedTicket.environmentId)?.name || 'Ambiente Externo'}
                               </p>
                            </div>
                         </div>

                         {selectedTicket.assetId && (
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                  <ImageIcon size={20} />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patrimônio / Equipamento</p>
                                  <p className="text-sm font-bold text-slate-700">
                                     {assets.find(a => a.id === selectedTicket.assetId)?.name || 'Equipamento não encontrado'}
                                  </p>
                                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                     CÓDIGO: {assets.find(a => a.id === selectedTicket.assetId)?.tagCode}
                                  </p>
                               </div>
                            </div>
                          )}

                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                               <User size={20} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solicitante</p>
                               <p className="text-sm font-bold text-slate-700">
                                  {technicians.find(u => u.uid === selectedTicket.requesterId)?.name || 'Anônimo'}
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prioridade</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${getPriorityBadge(selectedTicket.priority)}`}>
                               {selectedTicket.priority}
                            </span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data de Abertura</span>
                            <span className="text-xs font-bold text-slate-700">{new Date(selectedTicket.createdAt).toLocaleDateString('pt-BR')}</span>
                         </div>
                         <div className="flex items-center justify-between text-xs font-bold pt-4 border-t border-slate-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipe Resp.</span>
                            <span className="text-bento-blue-deep">
                               {teams.find(t => t.id === selectedTicket.assignedTeamId)?.name || 'Não atribuído'}
                            </span>
                         </div>
                      </div>

                      {selectedTicket.status === 'completed' && selectedTicket.cost !== undefined && (
                        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
                           <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Custo da Manutenção</p>
                           <p className="text-3xl font-black text-emerald-700 tracking-tighter">
                              R$ {selectedTicket.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           </p>
                        </div>
                      )}
                   </div>
                </div>

                {selectedTicket.imageUrl && (
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <ImageIcon size={12} />
                      Imagem Anexada
                    </p>
                    <div className="rounded-[32px] overflow-hidden border border-slate-100 shadow-lg">
                      <img 
                        src={selectedTicket.imageUrl} 
                        alt="Anexo do problema" 
                        className="w-full h-auto object-cover max-h-[400px]"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                {selectedTicket.signatureUrl && (
                  <div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Assinatura de Recebimento</p>
                    <img src={selectedTicket.signatureUrl} alt="Assinatura" className="h-20 object-contain mx-auto" />
                  </div>
                )}

                {/* Completion Form - Only for non-completed tickets and staff */}
                {selectedTicket.status !== 'completed' && selectedTicket.status !== 'cancelled' && (
                  <div className="mt-8 pt-8 border-t border-slate-50 space-y-8">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 size={20} className="text-emerald-500" />
                       <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">Finalização de Serviço</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fotos do "Depois" (Comprovação)</label>
                        <div className="flex flex-wrap gap-2">
                          {afterImages.map((img, idx) => (
                            <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 relative group">
                              <img src={img} className="w-full h-full object-cover" alt={`After ${idx}`} />
                              <button 
                                onClick={() => setAfterImages(afterImages.filter((_, i) => i !== idx))}
                                className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-bento-accent hover:text-bento-accent transition-all cursor-pointer">
                            <Plus size={24} />
                            <input type="file" accept="image/*" onChange={handleAfterFileChange} className="hidden" />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Materiais Utilizados (Estoque)</label>
                        <div className="space-y-2">
                           <div className="flex gap-2">
                              <select 
                                onChange={(e) => addInventoryItem(e.target.value)}
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs"
                              >
                                <option value="">+ Adicionar Item do Inventário</option>
                                {inventory.map(item => (
                                  <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                ))}
                              </select>
                           </div>
                           <div className="space-y-1">
                              {usedInventoryItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                   <div className="flex items-center gap-2">
                                      <Package size={14} className="text-slate-400" />
                                      <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                         <button onClick={() => {
                                            const next = [...usedInventoryItems];
                                            if (next[idx].quantity > 1) {
                                               next[idx].quantity -= 1;
                                               setUsedInventoryItems(next);
                                            }
                                         }} className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 text-sm">-</button>
                                         <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                                         <button onClick={() => {
                                            const next = [...usedInventoryItems];
                                            next[idx].quantity += 1;
                                            setUsedInventoryItems(next);
                                         }} className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 text-sm">+</button>
                                      </div>
                                      <button 
                                        onClick={() => setUsedInventoryItems(usedInventoryItems.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-600"
                                      >
                                        <X size={14} />
                                      </button>
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Observações Finais do Técnico</label>
                         <textarea 
                           value={completionNote}
                           onChange={(e) => setCompletionNote(e.target.value)}
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 outline-none transition-all font-medium text-xs h-24 resize-none"
                           placeholder="Relate o que foi feito..."
                         />
                      </div>

                      <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                               <DollarSign size={12} />
                               Custos Extras (Mão de Obra/Serviços)
                            </label>
                            <div className="relative">
                               <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 font-bold">R$</span>
                               <input 
                                 type="number"
                                 step="0.01"
                                 value={completionCost}
                                 onChange={(e) => setCompletionCost(e.target.value)}
                                 placeholder="0,00"
                                 className="w-full pl-12 pr-6 py-5 bg-white/10 border border-white/20 rounded-2xl focus:ring-4 focus:ring-bento-accent/20 outline-none transition-all font-black text-xl text-bento-accent"
                               />
                            </div>
                         </div>

                         <button 
                           onClick={() => setShowSignature(true)}
                           disabled={isCompleting}
                           className="w-full py-5 bg-bento-accent text-bento-sidebar rounded-2xl font-black shadow-xl shadow-bento-accent/10 hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                         >
                            {isCompleting ? 'Processando...' : 'Assinar & Finalizar'}
                         </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {showSignature && (
           <SignaturePad 
             onSave={(dataUrl) => handleCompleteTicket(dataUrl)}
             onCancel={() => setShowSignature(false)}
           />
         )}
      </AnimatePresence>

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
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold leading-relaxed"
                  >
                    <AlertTriangle size={18} className="shrink-0" />
                    <p>{errorMsg}</p>
                  </motion.div>
                )}
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
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Patrimônio / Equipamento (Opcional)</label>
                  <select 
                    value={newTicket.assetId}
                    onChange={(e) => setNewTicket({...newTicket, assetId: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none font-bold"
                  >
                    <option value="">Nenhum patrimônio específico</option>
                    {assets
                      .filter(a => !newTicket.environmentId || a.environmentId === newTicket.environmentId)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>
                          [{asset.tagCode}] {asset.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                    {newTicket.environmentId 
                      ? 'Mostrando somente equipamentos deste ambiente.' 
                      : 'Selecione um ambiente para filtrar os equipamentos.'}
                  </p>
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anexar Foto do Problema (Opcional)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all group">
                      <Camera size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {newTicket.imageUrl ? 'Trocar Foto' : 'Tirar ou Escolher Foto'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                    {newTicket.imageUrl && (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-100 bg-white shadow-md relative group">
                        <img src={newTicket.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          type="button"
                          onClick={() => setNewTicket({...newTicket, imageUrl: ''})}
                          className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
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
