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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Only fetch appUser if email is verified
        if (firebaseUser.emailVerified) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            // Force admin role for the legitimate owner in state
            if (firebaseUser.email === 'Jhonatas.Cadorin@gmail.com' && userData.role !== 'admin') {
              userData.role = 'admin';
            }
            setAppUser(userData);
          }
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

  // If user is authenticated but not verified, show verification screen
  if (user && !user.emailVerified) {
    return <VerifyEmail />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route element={user ? <Layout appUser={appUser} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/environments" element={<Environments />} />
          <Route path="/environments/:id" element={<EnvironmentDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/assets" element={<FixedAssets />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/scan" element={<QRScannerPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/users" element={<UserAdmin />} />
        </Route>
      </Routes>
    </Router>
  );
}

