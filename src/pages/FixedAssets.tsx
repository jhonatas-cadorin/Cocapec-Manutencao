import React, { useEffect, useState, FormEvent } from 'react';
import { collection, onSnapshot, query, addDoc, doc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FixedAsset, Environment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Trash2, 
  X, 
  Monitor, 
  Layout, 
  Settings,
  Tag,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Archive,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

export default function FixedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [newAsset, setNewAsset] = useState<Omit<FixedAsset, 'id'>>({
    tagCode: '',
    name: '',
    category: 'Eletrônicos',
    environmentId: '',
    status: 'operational',
    acquisitionDate: new Date().toISOString().split('T')[0],
    description: '',
    imageUrl: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64 storage
        alert('A imagem é muito grande. Por favor, escolha uma imagem menor que 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAsset({ ...newAsset, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Assets listener
    const qAssets = query(collection(db, 'fixed_assets'), orderBy('tagCode', 'asc'));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedAsset)));
    });

    // Environments listener
    const qEnv = query(collection(db, 'environments'), orderBy('name', 'asc'));
    const unsubscribeEnv = onSnapshot(qEnv, (snapshot) => {
      setEnvironments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Environment)));
    });

    return () => {
      unsubscribeAssets();
      unsubscribeEnv();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAsset.tagCode || !newAsset.name || !newAsset.environmentId) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'fixed_assets'), newAsset);
      setShowAddModal(false);
      setNewAsset({
        tagCode: '',
        name: '',
        category: 'Eletrônicos',
        environmentId: '',
        status: 'operational',
        acquisitionDate: new Date().toISOString().split('T')[0],
        description: '',
        imageUrl: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteAsset = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este imobilizado?')) {
      await deleteDoc(doc(db, 'fixed_assets', id));
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'operational': return { label: 'Operacional', color: 'text-green-600 bg-green-50', icon: CheckCircle2 };
      case 'maintenance': return { label: 'Manutenção', color: 'text-amber-600 bg-amber-50', icon: AlertCircle };
      case 'broken': return { label: 'Avariado', color: 'text-red-600 bg-red-50', icon: AlertCircle };
      case 'disposed': return { label: 'Descartado', color: 'text-slate-600 bg-slate-50', icon: Archive };
      default: return { label: status, color: 'text-slate-600 bg-slate-50', icon: CheckCircle2 };
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    asset.tagCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Patrimônio / Imobilizados</h1>
          <p className="text-slate-500 font-medium">Controle de bens permanentes e placas de identificação</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-bento-blue-deep text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Patrimônio</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
         <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
               type="text" 
               placeholder="Buscar por nome ou código da placa..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-medium"
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAssets.map((asset) => {
          const status = getStatusInfo(asset.status);
          const env = environments.find(e => e.id === asset.environmentId);
          return (
            <motion.div
              key={asset.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bento-card group hover:border-bento-accent transition-all"
            >
              <div className="bento-card-header flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <Tag size={14} className="text-bento-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Placa: {asset.tagCode}</span>
                 </div>
                 <button onClick={() => deleteAsset(asset.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                 </button>
              </div>

              {asset.imageUrl && (
                <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 border border-slate-50">
                  <img 
                    src={asset.imageUrl} 
                    alt={asset.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="flex-1 space-y-4">
                 <div>
                    <h3 className="text-lg font-display font-black text-slate-800 tracking-tight leading-tight uppercase group-hover:text-bento-blue-deep transition-colors">
                       {asset.name}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{asset.category}</p>
                 </div>

                 <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-50">
                    <Building2 size={16} className="text-slate-400" />
                    <div className="flex-1 overflow-hidden">
                       <p className="text-[11px] font-bold text-slate-600 truncate">{env?.name || 'Local não definido'}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{env?.building} - {env?.floor}º Piso</p>
                    </div>
                 </div>

                 <div className="flex items-center justify-between pt-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${status.color}`}>
                       <status.icon size={12} />
                       {status.label}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aquis.: {new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}</span>
                 </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                 <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Ver Detalhes</button>
                 <button className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:brightness-110 transition-all">Manutenção</button>
              </div>
            </motion.div>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-white/50 rounded-[40px] border-4 border-dashed border-slate-100">
             <Tag size={48} className="mx-auto text-slate-200" />
             <div className="max-w-xs mx-auto">
                <p className="text-xl font-display font-black text-slate-400 uppercase tracking-tighter">Nenhum Patrimônio</p>
                <p className="text-sm text-slate-400 mt-1">Nenhum bem imobilizado foi encontrado com os termos de busca.</p>
             </div>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">Novo Imobilizado</h2>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Vincule o patrimônio à sua placa de identificação.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Código da Placa</label>
                    <input 
                      required
                      type="text" 
                      value={newAsset.tagCode}
                      onChange={(e) => setNewAsset({...newAsset, tagCode: e.target.value})}
                      placeholder="Ex: PM-2024-001"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria</label>
                    <select 
                      value={newAsset.category}
                      onChange={(e) => setNewAsset({...newAsset, category: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold appearance-none"
                    >
                      <option value="Mobiliário">Mobiliário</option>
                      <option value="Eletrônicos">Eletrônicos</option>
                      <option value="Maquinário">Maquinário</option>
                      <option value="Ferramentas">Ferramentas</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Produto</label>
                  <input 
                    required
                    type="text" 
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                    placeholder="Ex: Cadeira Ergonômica Pro"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ambiente de Instalação</label>
                  <select 
                    required
                    value={newAsset.environmentId}
                    onChange={(e) => setNewAsset({...newAsset, environmentId: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold appearance-none"
                  >
                    <option value="">Selecione o ambiente</option>
                    {environments.map(env => (
                      <option key={env.id} value={env.id}>{env.name} ({env.building})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagem do Produto</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                      <Camera size={20} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {newAsset.imageUrl ? 'Trocar Imagem' : 'Selecionar Imagem'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                    {newAsset.imageUrl && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={newAsset.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mt-1">Limite de 500KB (Base64)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data de Aquisição</label>
                    <input 
                      type="date" 
                      value={newAsset.acquisitionDate}
                      onChange={(e) => setNewAsset({...newAsset, acquisitionDate: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Inicial</label>
                    <select 
                      value={newAsset.status}
                      onChange={(e) => setNewAsset({...newAsset, status: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent outline-none transition-all font-bold appearance-none"
                    >
                      <option value="operational">Operacional</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="broken">Avariado</option>
                    </select>
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
                    {loading ? 'Cadastrando...' : 'Salvar Patrimônio'}
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
