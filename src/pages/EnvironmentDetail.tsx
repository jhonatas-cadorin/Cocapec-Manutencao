import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Environment, Ticket, InventoryItem, FixedAsset, translateStatus, translatePriority, translateType } from '../types';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  History, 
  Package, 
  ArrowLeft, 
  Plus, 
  Building2, 
  Layers,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Tag,
  QrCode,
  Printer,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence } from 'framer-motion';

export default function EnvironmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<InventoryItem[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const docRef = doc(db, 'environments', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEnvironment({ id: docSnap.id, ...docSnap.data() } as Environment);
      }
      setLoading(false);
    };

    fetchData();

    // Tickets History
    const qTickets = query(
      collection(db, 'tickets'),
      where('environmentId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeTickets = onSnapshot(qTickets, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
    });

    // Fixed Assets in this room
    const qFixed = query(
      collection(db, 'fixed_assets'),
      where('environmentId', '==', id)
    );
    const unsubscribeFixed = onSnapshot(qFixed, (snapshot) => {
      setFixedAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedAsset)));
    });

    const qAssets = query(collection(db, 'inventory'));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
      const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setAssets(allItems.slice(0, 3)); 
    });

    return () => {
      unsubscribeTickets();
      unsubscribeAssets();
      unsubscribeFixed();
    };
  }, [id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'open': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'in_progress': return <Clock className="text-blue-500" size={16} />;
      default: return <Clock className="text-slate-400" size={16} />;
    }
  };

  const handlePrintQR = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bento-blue-deep"></div>
    </div>
  );

  if (!environment) return (
    <div className="text-center p-20 space-y-4">
       <AlertTriangle size={48} className="mx-auto text-red-500" />
       <h2 className="text-2xl font-bold">Ambiente não encontrado</h2>
       <button onClick={() => navigate('/environments')} className="text-bento-blue-deep font-bold underline">Voltar para a lista</button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate(-1)} 
          className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
           <h1 className="text-3xl font-display font-black text-slate-900 tracking-tighter uppercase">{environment.name}</h1>
           <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
              <span className="flex items-center gap-1"><Building2 size={12} /> {environment.building}</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
              <span className="flex items-center gap-1"><Layers size={12} /> Piso {environment.floor}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Actions */}
        <div className="space-y-6">
           <div className="bento-card">
              <div className="bento-card-header">Sobre o Local</div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                 {environment.description || 'Nenhuma descrição detalhada disponível para este ambiente.'}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                 <Link 
                    to={`/tickets?env=${environment.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-bento-blue-deep text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 transition-all uppercase tracking-widest text-xs"
                 >
                    <Plus size={18} />
                    Abrir Novo Chamado
                 </Link>
                 <button 
                    onClick={() => setShowQRModal(true)}
                    className="flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold border border-slate-100 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
                 >
                    <QrCode size={18} />
                    Imprimir Etiqueta QR
                 </button>
              </div>
           </div>

           {/* Fixed Assets Listing */}
           <div className="bento-card">
              <div className="bento-card-header flex justify-between items-center">
                 <span>Patrimônio Instalado</span>
                 <Tag size={16} className="text-slate-300" />
              </div>
              <div className="space-y-3 mt-2">
                 {fixedAssets.length > 0 ? (
                   fixedAssets.map((fasset) => (
                     <div key={fasset.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                           {fasset.imageUrl ? (
                             <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-white shadow-sm shrink-0">
                               <img src={fasset.imageUrl} alt={fasset.name} className="w-full h-full object-cover" />
                             </div>
                           ) : (
                             <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-bento-accent border border-slate-100 shadow-sm shrink-0">
                                <Tag size={14} />
                             </div>
                           )}
                           <div className="overflow-hidden">
                              <p className="text-[11px] font-bold text-slate-700 leading-tight truncate">{fasset.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Placa: {fasset.tagCode}</p>
                           </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${fasset.status === 'operational' ? 'bg-green-500' : 'bg-amber-500'}`} />
                     </div>
                   ))
                 ) : (
                   <p className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-40">Nenhum patrimônio vinculado</p>
                 )}
                 <Link 
                    to="/assets" 
                    className="block w-full text-center py-2 text-[10px] font-bold text-bento-accent uppercase tracking-widest hover:underline mt-2"
                 >
                    Gerenciar Itens
                 </Link>
              </div>
           </div>

           {/* Assets/Materials in this environment */}
           <div className="bento-card">
              <div className="bento-card-header flex justify-between items-center">
                 <span>Ativos & Materiais</span>
                 <Package size={16} className="text-slate-300" />
              </div>
              <div className="space-y-3 mt-2">
                 {assets.map((asset, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-bento-blue-deep border border-slate-100 shadow-sm shrink-0">
                             <Package size={14} />
                          </div>
                          <div>
                             <p className="text-[11px] font-bold text-slate-700 leading-tight">{asset.name}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{asset.category}</p>
                          </div>
                       </div>
                       <span className={`text-[10px] font-black uppercase shrink-0 ${asset.quantity > asset.minQuantity ? 'text-green-500' : 'text-red-500'}`}>
                          {asset.quantity} {asset.unit}
                       </span>
                    </div>
                 ))}
                 <button className="w-full text-center py-2 text-[10px] font-bold text-bento-accent uppercase tracking-widest hover:underline mt-2">
                    Ver todos os ativos
                 </button>
              </div>
           </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bento-card h-full min-h-[400px]">
              <div className="bento-card-header flex items-center gap-2">
                 <History size={16} />
                 Histórico de Intervenções
              </div>
              <div className="space-y-0 divide-y divide-slate-50 mt-4 h-[600px] overflow-y-auto no-scrollbar pr-2">
                 {tickets.length > 0 ? (
                    tickets.map((ticket) => (
                       <div key={ticket.id} className="py-5 group cursor-pointer">
                          <div className="flex justify-between items-start">
                             <div className="flex-1 space-y-1 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                   <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                      ticket.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                   }`}>
                                      {translateStatus(ticket.status)}
                                   </span>
                                   <span className="text-[9px] font-bold text-slate-400">#{ticket.id.slice(0, 8)}</span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 group-hover:text-bento-blue-deep transition-colors leading-tight">{ticket.title}</h4>
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{ticket.description}</p>
                             </div>
                             <div className="text-right shrink-0">
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                   {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-2">
                                   {getStatusIcon(ticket.status)}
                                </div>
                             </div>
                          </div>
                          <div className="mt-4 flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                Prioridade: <span className="text-slate-600">{translatePriority(ticket.priority)}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                Tipo: <span className="text-slate-600">{translateType(ticket.type)}</span>
                             </div>
                             {ticket.cost !== undefined && ticket.cost > 0 && (
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                   Custo: <span>R$ {ticket.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                             )}
                          </div>
                       </div>
                    ))
                 ) : (
                    <div className="py-20 text-center opacity-30">
                       <History size={48} className="mx-auto mb-4" />
                       <p className="text-xl font-display font-black uppercase tracking-tighter">Sem Histórico</p>
                       <p className="text-sm font-medium mt-1">Nenhum chamado registrado para este ambiente ainda.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && environment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 print:p-0 print:shadow-none print:static print:w-auto"
            >
              <div className="flex justify-between items-center mb-6 print:hidden">
                <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">Etiqueta de Ambiente</h2>
                <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div id="qr-printable-area" className="flex flex-col items-center text-center space-y-6 bg-white p-6 rounded-[32px] border-2 border-slate-50">
                 <div className="w-full">
                    <h3 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">
                       {environment.name}
                    </h3>
                    <p className="text-[10px] font-black text-bento-accent uppercase tracking-[0.2em]">
                       {environment.building} — Piso {environment.floor}
                    </p>
                 </div>

                 <div className="p-6 bg-white border-4 border-slate-900 rounded-[32px] shadow-xl shadow-slate-200">
                    <QRCodeSVG 
                      value={`${window.location.origin}/environments/${environment.id}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                 </div>

                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escaneie para abrir novo chamado</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{environment.id}</p>
                 </div>
              </div>

              <div className="mt-8 flex gap-3 print:hidden">
                 <button 
                   onClick={() => setShowQRModal(false)}
                   className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                 >
                   Fechar
                 </button>
                 <button 
                   onClick={handlePrintQR}
                   className="flex-[2] flex items-center justify-center gap-2 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:brightness-110 active:scale-95 transition-all"
                 >
                   <Printer size={18} />
                   Imprimir Etiqueta
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #qr-printable-area, #qr-printable-area * {
            visibility: visible;
          }
          #qr-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            padding: 40px;
          }
        }
      `}</style>
    </div>
  );
}
