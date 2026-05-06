import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/config';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { checkAdmin } from './firebase/services';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminStatus = await checkAdmin(user.email || '');
        if (adminStatus) {
          setUser(user);
          setIsAdmin(true);
        } else {
          await auth.signOut();
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#00FF00] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user || !isAdmin) return <Navigate to="/admin/login" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00FF00] selection:text-black font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
