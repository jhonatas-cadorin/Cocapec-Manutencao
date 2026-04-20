import { useEffect, useState, FormEvent } from 'react';
import { collection, onSnapshot, query, addDoc, orderBy, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Environment, FixedAsset } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Plus, 
  Search, 
  Building2, 
  Layers, 
  QrCode, 
  X, 
  ExternalLink,
  ChevronRight,
  Printer,
  Edit2,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function Environments() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedQR, setSelectedQR] = useState<Environment | null>(null);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: '',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'environments'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEnvironments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Environment)));
    });

    const qAssets = query(collection(db, 'fixed_assets'));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedAsset)));
    });

    return () => {
      unsubscribe();
      unsubscribeAssets();
    };
  }, []);

  const openAddModal = () => {
    setEditingEnv(null);
    setFormData({ name: '', building: '', floor: '', description: '' });
    setShowAddModal(true);
  };

  const openEditModal = (env: Environment) => {
    setEditingEnv(env);
    setFormData({
      name: env.name,
      building: env.building,
      floor: env.floor,
      description: env.description || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingEnv) {
        await updateDoc(doc(db, 'environments', editingEnv.id), formData);
        alert('Ambiente atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'environments'), formData);
        alert('Ambiente cadastrado com sucesso!');
      }
      setShowAddModal(false);
      setFormData({ name: '', building: '', floor: '', description: '' });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar ambiente.');
    } finally {
      setLoading(false);
    }
  };

  const filteredEnvironments = environments.filter(env => 
    env.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    env.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
    env.floor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Ambientes</h1>
          <p className="text-gray-500 mt-1">Locais físicos cadastrados para manutenção.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Ambiente</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome, prédio ou andar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEnvironments.map((env) => (
          <motion.div
            key={env.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group hover:border-blue-400 transition-colors"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal(env)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar ambiente"
                  >
                    <Edit2 size={18} />
                  </button>
                  <Link 
                    to={`/tickets?env=${env.id}`}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-2"
                    title="Abrir chamado para este ambiente"
                  >
                    <Plus size={20} />
                  </Link>
                </div>
              </div>

              <div>
                <Link to={`/environments/${env.id}`}>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{env.name}</h3>
                </Link>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 font-medium">
                  <MapPin size={14} className="text-blue-400" />
                  <span>{env.building}</span>
                  <span className="text-gray-300">•</span>
                  <Layers size={14} className="text-blue-400" />
                  <span>{env.floor}</span>
                </div>
                {env.description && (
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">{env.description}</p>
                )}
              </div>

              {/* Assets Summary */}
              <div className="pt-4 border-t border-slate-50">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                       <Package size={12} />
                       Ativos Vinculados
                    </span>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                       {assets.filter(a => a.environmentId === env.id).length}
                    </span>
                 </div>
                 <div className="flex -space-x-2 overflow-hidden">
                    {assets.filter(a => a.environmentId === env.id).slice(0, 5).map((a, i) => (
                       <div key={a.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500" title={a.name}>
                          {a.name.charAt(0)}
                       </div>
                    ))}
                    {assets.filter(a => a.environmentId === env.id).length > 5 && (
                       <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 text-center leading-none">
                          +{assets.filter(a => a.environmentId === env.id).length - 5}
                       </div>
                    )}
                 </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
              <button 
                onClick={() => setSelectedQR(env)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-blue-600"
              >
                <QrCode size={16} />
                <span>QR Code</span>
              </button>
              <Link to={`/tickets?env=${env.id}`} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-blue-600 hover:underline">
                Chamados <ChevronRight size={14} />
              </Link>
            </div>
          </motion.div>
        ))}

        {environments.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400">
            <MapPin size={48} className="mx-auto opacity-10" />
            <p className="font-bold text-lg text-gray-900">Nenhum ambiente</p>
            <p className="text-sm">Cadastre os locais da cooperativa para gerar QR Codes.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 pb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{editingEnv ? 'Editar Ambiente' : 'Novo Ambiente'}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nome do Ambiente</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Sala de Reuniões 02"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Prédio/Bloco</label>
                    <input 
                      required
                      type="text" 
                      value={formData.building}
                      onChange={(e) => setFormData({...formData, building: e.target.value})}
                      placeholder="Ex: Bloco A"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Andar</label>
                    <input 
                      required
                      type="text" 
                      value={formData.floor}
                      onChange={(e) => setFormData({...formData, floor: e.target.value})}
                      placeholder="Ex: 2º Andar"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Descrição (Opcional)</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Notas adicionais sobre a localização..."
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {loading ? 'Salvando...' : (editingEnv ? 'Salvar Alterações' : 'Salvar Ambiente')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedQR(null)}
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
                <button onClick={() => setSelectedQR(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div id="qr-printable-area-env" className="flex flex-col items-center text-center space-y-6 bg-white p-6 rounded-[32px] border-2 border-slate-50">
                 <div className="w-full">
                    <h3 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">
                       {selectedQR.name}
                    </h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                       {selectedQR.building} — Piso {selectedQR.floor}
                    </p>
                 </div>

                 <div className="p-6 bg-white border-4 border-slate-900 rounded-[32px] shadow-xl shadow-slate-200">
                    <QRCodeSVG 
                      value={`${window.location.origin}/#/environments/${selectedQR.id}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                 </div>

                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escaneie para acesso rápido</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{selectedQR.id}</p>
                 </div>
              </div>

              <div className="mt-8 flex gap-3 print:hidden">
                 <button 
                   onClick={() => setSelectedQR(null)}
                   className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                 >
                   Fechar
                 </button>
                 <button 
                   onClick={() => window.print()}
                   className="flex-[2] flex items-center justify-center gap-2 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:brightness-110 active:scale-95 transition-all"
                 >
                   <Printer size={18} />
                   Imprimir
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body > #root > *:not(.fixed) {
            display: none !important;
          }
          .fixed.inset-0 {
             background: white !important;
             position: absolute !important;
          }
          #qr-printable-area-env {
            visibility: visible;
            position: absolute;
            left: 50%;
            top: 20%;
            transform: translate(-50%, -20%);
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
