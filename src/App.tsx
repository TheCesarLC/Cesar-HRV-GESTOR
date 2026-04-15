import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, isQuotaError } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sections from './pages/Sections';
import SectionDetail from './pages/SectionDetail';
import Admin from './pages/Admin';
import Layout from './components/Layout';
import ThemeProvider from './components/ThemeProvider';

function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            const newUserData = {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'user',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), newUserData);
            setUserData(newUserData);
          }
        } catch (error: any) {
          if (!isQuotaError(error)) {
            console.error("Error fetching user data:", error);
          }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Real-time user data updates
  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
      }, (error) => {
        if (!isQuotaError(error)) {
          console.error("User data snapshot error:", error);
        }
      });
      return () => unsub();
    }
  }, [user]);

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 font-medium animate-pulse">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  const isAdmin = userData?.role === 'admin' || user?.email === 'hugocesarlemuscortes@gmail.com';

  return (
    <ThemeProvider>
      <Router>
        <Toaster position="top-center" richColors closeButton />
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/" 
            element={user ? (
              <Layout user={user} isAdmin={isAdmin}>
                <Dashboard user={user} isAdmin={isAdmin} />
              </Layout>
            ) : <Navigate to="/login" />} 
          />
          <Route 
            path="/sections" 
            element={user ? (
              <Layout user={user} isAdmin={isAdmin}>
                <Sections />
              </Layout>
            ) : <Navigate to="/login" />} 
          />
          <Route 
            path="/sections/:sectionId" 
            element={user ? (
              <Layout user={user} isAdmin={isAdmin}>
                <SectionDetail />
              </Layout>
            ) : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={user && isAdmin ? (
              <Layout user={user} isAdmin={isAdmin}>
                <Admin />
              </Layout>
            ) : <Navigate to="/" />} 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
