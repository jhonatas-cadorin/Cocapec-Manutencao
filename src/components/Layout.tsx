import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  ClipboardList, 
  Package, 
  MapPin, 
  QrCode, 
  Calendar, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Home as HomeIcon,
  User as UserIcon,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Briefcase,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppUser, Ticket } from '../types';
import { useAppSettings } from '../hooks/useAppSettings';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  appUser: AppUser | null;
}

export default function Layout({ appUser }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const { settings: globalSettings } = useAppSettings();
  const location = useLocation();

  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, '_connection_test', 'status'));
      } catch (error: any) {
        if(error?.message?.includes('the client is offline')) {
          console.error("Firebase connection failed.");
        }
      }
    }
    testConnection();
  }, []);

  // Real-time notifications for assigned or open tickets
  useEffect(() => {
    if (!appUser) return;

    const q = query(
      collection(db, 'tickets'),
      where('status', 'in', ['open', 'assigned'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const ticket = change.doc.data() as Ticket;
          // Simple rule: if new ticket or assigned to current user
          if (ticket.status === 'open' || ticket.assignedToId === appUser.uid) {
            setNotification(`Novo chamado: ${ticket.title}`);
            setTimeout(() => setNotification(null), 5000);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [appUser]);

  const handleSignOut = () => {
    signOut(auth);
  };

  const menuItems = [
    { name: 'Início', path: '/', icon: HomeIcon },
    { name: 'Painel', path: '/dashboard', icon: BarChart3 },
    { name: 'Chamados', path: '/tickets', icon: ClipboardList },
    { name: 'Inventário', path: '/inventory', icon: Package },
    { name: 'Patrimônio', path: '/assets', icon: Briefcase },
    { name: 'Ambientes', path: '/environments', icon: MapPin },
    { name: 'Equipes', path: '/teams', icon: UsersIcon },
    { name: 'Calendário', path: '/calendar', icon: Calendar },
    { name: 'Escanear QR', path: '/scan', icon: QrCode },
    { name: 'Configurações', path: '/settings', icon: SettingsIcon },
    { name: 'Usuários', path: '/users', icon: UserIcon, isAdmin: true },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.isAdmin || appUser?.role === 'admin');

  return (
    <div className="flex flex-col min-h-screen bg-bento-bg text-bento-text font-sans">
      {/* Header for Mobile */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white border-b border-gray-200">
        <div className="mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-bento-blue-deep rounded-lg flex items-center justify-center text-white font-bold">
                {globalSettings?.companyName?.charAt(0) || 'C'}
              </div>
              <span className="font-display font-bold text-xl tracking-tight uppercase">
                {globalSettings?.companyName || 'COCAPEC'}
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-bento-blue-deep/10 flex items-center justify-center text-bento-blue-deep">
                <UserIcon size={18} />
             </div>
          </div>
        </div>
      </header>

      {/* Notifications Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-bento-blue-deep text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-blue-400/30 backdrop-blur-md"
          >
            <Bell size={20} className="animate-bounce" />
            <span className="font-bold text-sm tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 lg:p-5 gap-5 items-stretch h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 flex-col bg-bento-sidebar text-white rounded-2xl p-6 shadow-xl shrink-0">
          <div className="mb-10 block">
            <Link to="/" className="flex items-center gap-3">
              {globalSettings?.companyLogo ? (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-white/10">
                   <img src={globalSettings.companyLogo} alt={globalSettings.companyName} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-bento-accent rounded-xl flex items-center justify-center text-bento-sidebar font-black text-xl shrink-0">
                  {globalSettings?.companyName?.charAt(0) || 'C'}
                </div>
              )}
              <div className="overflow-hidden">
                <span className="font-display font-black text-2xl tracking-tighter text-bento-accent block truncate line-clamp-1">
                   {globalSettings?.companyName || 'COCAPEC'}
                </span>
                <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold -mt-1">Maint Manager</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                  location.pathname === item.path
                    ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/5'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} className={location.pathname === item.path ? 'text-bento-accent' : ''} />
                <span className="text-[13px] tracking-tight">{item.name}</span>
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-bento-accent/20 flex items-center justify-center text-bento-accent border border-bento-accent/30">
                <UserIcon size={18} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate leading-tight">{appUser?.name || 'Usuário'}</p>
                <p className="text-[10px] uppercase tracking-widest text-bento-accent font-bold opacity-80">{appUser?.role || 'Visitante'}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-400/10 transition-colors text-[13px] font-bold"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
            <p className="text-[10px] text-white/20 text-center font-bold tracking-widest pt-2 uppercase">v2.4 • COCAPEC</p>
          </div>
        </aside>

        {/* Content Area Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Info Bar Desktop */}
          <div className="hidden lg:flex items-center justify-between mb-4 px-2 shrink-0">
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <span>Páginas</span>
                <ChevronRight size={12} />
                <span className="text-slate-800">{location.pathname.replace('/', '') || 'Início'}</span>
             </div>
             <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 pr-4 border-r border-gray-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Servidor OK</span>
                </div>
                <button className="text-slate-400 hover:text-bento-blue-deep transition-colors relative">
                  <Bell size={18} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
             </div>
          </div>

          <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pr-1">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-gray-100">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                  {globalSettings?.companyLogo ? (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                       <img src={globalSettings.companyLogo} className="w-full h-full object-contain" alt="Logo" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                      {globalSettings?.companyName?.charAt(0) || 'C'}
                    </div>
                  )}
                  <span className="font-bold text-xl tracking-tight leading-none">
                     {globalSettings?.companyName || 'COCAPEC'}
                  </span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                {filteredMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${
                      location.pathname === item.path
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon size={22} />
                    <span className="text-lg">{item.name}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-6 border-t border-gray-100">
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{appUser?.name || 'Usuário'}</p>
                    <p className="text-sm text-gray-500 capitalize">{appUser?.role || 'Visitante'}</p>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-4 w-full rounded-xl bg-red-50 text-red-600 font-semibold"
                >
                  <LogOut size={22} />
                  <span>Sair</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
