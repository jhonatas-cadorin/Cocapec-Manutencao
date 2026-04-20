import { useEffect, useState, FormEvent } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InventoryItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Search, 
  MoreVertical, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  Trash2,
  Edit2
} from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'unid',
    minQuantity: 5
  });

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'inventory'), newItem);
      setShowAddModal(false);
      setNewItem({ name: '', category: '', quantity: 0, unit: 'unid', minQuantity: 5 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    await updateDoc(doc(db, 'inventory', id), { quantity: newQty });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Inventário</h1>
          <p className="text-slate-500 font-medium">Controle de materiais e ativos de manutenção</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-bento-blue-deep text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Item</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou categoria..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Low Stock Alerts */}
      {items.some(i => i.quantity <= i.minQuantity) && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="font-bold text-red-900">Alerta de Estoque Baixo</p>
              <p className="text-sm text-red-700">{items.filter(i => i.quantity <= i.minQuantity).length} itens precisam de reposição imediata.</p>
            </div>
          </div>
          <button className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-200">
            Resolver agora
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`bg-white rounded-3xl border ${item.quantity <= item.minQuantity ? 'border-red-200' : 'border-gray-200'} shadow-sm overflow-hidden flex flex-col group`}
          >
            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{item.category}</span>
                  <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="flex items-end justify-between pt-2">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Estoque atual</p>
                  <p className={`text-4xl font-black tracking-tighter ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.quantity}<span className="text-sm font-bold text-gray-400 ml-1 uppercase">{item.unit}</span>
                  </p>
                </div>
                {item.quantity <= item.minQuantity && (
                  <div className="text-red-600 animate-pulse">
                    <AlertTriangle size={24} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button 
                onClick={() => updateQuantity(item.id, -1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-95"
              >
                <ArrowDownLeft size={18} />
                <span>Saída</span>
              </button>
              <button 
                onClick={() => updateQuantity(item.id, 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all active:scale-95"
              >
                <ArrowUpRight size={18} />
                <span>Entrada</span>
              </button>
            </div>
          </motion.div>
        ))}

        {items.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[32px] border-2 border-dashed border-gray-200 text-gray-400">
            <Package size={48} className="mx-auto opacity-20" />
            <p className="font-bold text-lg text-gray-900">Estoque vazio</p>
            <p className="text-sm">Cadastre materiais e peças para começar.</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
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
                <h2 className="text-2xl font-bold text-gray-900">Novo Item</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nome do Material</label>
                  <input 
                    required
                    type="text" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder="Ex: Lâmpada LED 9W"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Categoria</label>
                    <input 
                      required
                      type="text" 
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      placeholder="Ex: Elétrica"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Unidade</label>
                    <select 
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="unid">Unidade</option>
                      <option value="pct">Pacote</option>
                      <option value="m">Metro</option>
                      <option value="kg">Quilo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Quantidade Inicial</label>
                    <input 
                      required
                      type="number" 
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Mínimo para Alerta</label>
                    <input 
                      required
                      type="number" 
                      value={newItem.minQuantity}
                      onChange={(e) => setNewItem({...newItem, minQuantity: parseInt(e.target.value) || 0})}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? 'Cadastrando...' : 'Adicionar ao Estoque'}
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
