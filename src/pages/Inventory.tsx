import { useEffect, useState, FormEvent } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { InventoryItem, InventoryTransaction, AppUser } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  Trash2,
  Edit2,
  History,
  Clock,
  User,
  Tag,
  Download
} from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'unid',
    minQuantity: 5,
    unitCost: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });

    const qTrans = query(collection(db, 'inventory_transactions'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction)));
    });

    // Get current user info for transactions
    if (auth.currentUser) {
      onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
        setCurrentUser(doc.data() as AppUser);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeTrans();
    };
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', category: '', quantity: 0, unit: 'unid', minQuantity: 5, unitCost: 0 });
    setShowAddModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity,
      unitCost: item.unitCost || 0
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        const batch = writeBatch(db);
        const itemRef = doc(db, 'inventory', editingItem.id);
        
        // Record transaction if quantity changed
        if (formData.quantity !== editingItem.quantity) {
          const delta = formData.quantity - editingItem.quantity;
          const transRef = doc(collection(db, 'inventory_transactions'));
          batch.set(transRef, {
            itemId: editingItem.id,
            itemName: formData.name,
            type: delta > 0 ? 'in' : 'out',
            quantity: Math.abs(delta),
            previousQuantity: editingItem.quantity,
            newQuantity: formData.quantity,
            userId: auth.currentUser?.uid,
            userName: currentUser?.name || 'Administrador',
            timestamp: serverTimestamp(),
            reason: 'Ajuste manual via edição'
          });
        }

        batch.update(itemRef, formData);
        await batch.commit();
        alert('Item atualizado com sucesso!');
      } else {
        const docRef = await addDoc(collection(db, 'inventory'), formData);
        
        // Record initial inventory entry
        await addDoc(collection(db, 'inventory_transactions'), {
          itemId: docRef.id,
          itemName: formData.name,
          type: 'in',
          quantity: formData.quantity,
          previousQuantity: 0,
          newQuantity: formData.quantity,
          userId: auth.currentUser?.uid,
          userName: currentUser?.name || 'Administrador',
          timestamp: serverTimestamp(),
          reason: 'Entrada inicial de cadastro'
        });

        alert('Item cadastrado com sucesso!');
      }
      setShowAddModal(false);
      setFormData({ name: '', category: '', quantity: 0, unit: 'unid', minQuantity: 5, unitCost: 0 });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      await deleteDoc(doc(db, 'inventory', id));
    }
  };

  const updateQuantity = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === item.quantity) return;

    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, 'inventory', id);
      const transRef = doc(collection(db, 'inventory_transactions'));

      batch.update(itemRef, { quantity: newQty });
      batch.set(transRef, {
        itemId: id,
        itemName: item.name,
        type: delta > 0 ? 'in' : 'out',
        quantity: Math.abs(delta),
        previousQuantity: item.quantity,
        newQuantity: newQty,
        userId: auth.currentUser?.uid,
        userName: currentUser?.name || 'Administrador',
        timestamp: serverTimestamp(),
        reason: delta > 0 ? 'Entrada rápida' : 'Saída rápida'
      });

      await batch.commit();
    } catch (err) {
      console.error('Erro ao atualizar quantidade:', err);
    }
  };

  const exportInventoryCSV = () => {
    if (items.length === 0) return;
    const headers = ['ID', 'Nome', 'Categoria', 'Quantidade', 'Unidade', 'Custo Unitário', 'Mínimo'];
    const rows = items.map(item => [
      item.id,
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.unitCost || 0,
      item.minQuantity
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "estoque_manutencao.csv");
    document.body.appendChild(link);
    link.click();
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tighter uppercase">Inventário</h1>
          <p className="text-slate-500 font-medium">Controle de materiais e ativos de manutenção</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportInventoryCSV}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            title="Exportar Estoque"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <History size={20} />
            <span className="hidden md:inline">Histórico</span>
          </button>
          <button 
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-bento-blue-deep text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou categoria..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        {filteredItems.map((item) => (
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
                  {item.unitCost !== undefined && item.unitCost > 0 && (
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded inline-block">
                      Custo: R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal(item)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Editar item"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
                <h2 className="text-2xl font-bold text-gray-900">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
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
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      placeholder="Ex: Elétrica"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Unidade</label>
                    <select 
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
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
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Quantidade Atual</label>
                    <input 
                      required
                      type="number" 
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Custo Unitário (R$)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({...formData, unitCost: parseFloat(e.target.value) || 0})}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Mínimo para Alerta</label>
                  <input 
                    required
                    type="number" 
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({...formData, minQuantity: parseInt(e.target.value) || 0})}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Adicionar ao Estoque')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900">Histórico de Movimentações</h2>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Últimas 50 transações de estoque</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                   {transactions.length === 0 ? (
                     <div className="text-center py-10 text-slate-400">Nenhuma movimentação registrada.</div>
                   ) : (
                     transactions.map((t) => (
                       <div key={t.id} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-md group">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                             {t.type === 'in' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-900 truncate">{t.itemName}</h4>
                                <span className={`text-[11px] font-black uppercase ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                   {t.type === 'in' ? '+' : '-'}{t.quantity}
                                </span>
                             </div>
                             <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                   <User size={10} />
                                   <span>{t.userName}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                   <Clock size={10} />
                                   <span>{t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString('pt-BR') : 'Agora'}</span>
                                </div>
                             </div>
                             {t.reason && (
                               <p className="text-[10px] text-slate-500 mt-2 italic flex items-center gap-1">
                                  <Tag size={10} />
                                  {t.reason}
                               </p>
                             )}
                          </div>
                       </div>
                     ))
                   )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
