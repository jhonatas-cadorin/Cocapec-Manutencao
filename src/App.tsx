import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { AppUser } from './types';

// Components
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Inventory from './pages/Inventory';
import Environments from './pages/Environments';
import QRScannerPage from './pages/QRScannerPage';
import CalendarPage from './pages/CalendarPage';
import Teams from './pages/Teams';
import EnvironmentDetail from './pages/EnvironmentDetail';
import Settings from './pages/Settings';
import FixedAssets from './pages/FixedAssets';
import UserAdmin from './pages/UserAdmin';
import PreventiveMaintenance from './pages/PreventiveMaintenance';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or Create basic profile for the main admin
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as AppUser;
          // Force admin role for the legitimate owner in state
          if (firebaseUser.email?.toLowerCase() === 'jhonatas.cadorin@gmail.com' && userData.role !== 'admin') {
            userData.role = 'admin';
          }
          setAppUser(userData);
        } else if (firebaseUser.email?.toLowerCase() === 'jhonatas.cadorin@gmail.com') {
          // Auto-mock profile if missing for the owner
          const adminProfile: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: 'Administrador',
            role: 'admin',
            skills: [],
            createdAt: new Date().toISOString()
          };
          setAppUser(adminProfile);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is authenticated...
  // (Removed email verification block)

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route element={user ? <Layout appUser={appUser} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={
            ['admin', 'leader', 'tech', 'user'].includes(appUser?.role || '') ? <Dashboard /> : <Navigate to="/" />
          } />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/inventory" element={
            ['admin', 'leader', 'tech', 'user'].includes(appUser?.role || '') ? <Inventory /> : <Navigate to="/" />
          } />
          <Route path="/environments" element={
            ['admin', 'leader', 'tech', 'user', 'contractor'].includes(appUser?.role || '') ? <Environments /> : <Navigate to="/" />
          } />
          <Route path="/environments/:id" element={<EnvironmentDetail />} />
          <Route path="/teams" element={
            ['admin', 'leader', 'tech', 'user'].includes(appUser?.role || '') ? <Teams /> : <Navigate to="/" />
          } />
          <Route path="/assets" element={
            ['admin', 'leader', 'tech', 'user'].includes(appUser?.role || '') ? <FixedAssets /> : <Navigate to="/" />
          } />
          <Route path="/settings" element={['admin', 'leader', 'tech', 'user'].includes(appUser?.role || '') ? <Settings /> : <Navigate to="/" />} />
          <Route path="/scan" element={<QRScannerPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/preventive" element={
            ['admin', 'leader', 'tech', 'user'].includes(appUser?.role || '') ? <PreventiveMaintenance /> : <Navigate to="/" />
          } />
          <Route path="/users" element={['admin', 'leader'].includes(appUser?.role || '') ? <UserAdmin /> : <Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
}

