import { useEffect, useState, useContext, ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import Toast from '@/components/Toast';
import { ToastContext } from '@/components/ToastContext';
import { setToastHandler, clearToastHandler } from '@/components/toastService';
import { ThemeContext } from '@/components/ThemeContext';
import { LanguageProvider } from '@/locales';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Vault from '@/pages/Vault';
import Notes from '@/pages/Notes';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import BreachMonitor from '@/pages/BreachMonitor';
import Wallet from '@/pages/Wallet';
import { initAuth, setAuthToken, api } from '@/api/client';
import { getThemeColor } from './themeColors';

interface PrivateRouteProps {
  authed: boolean;
  children: ReactNode;
}

function PrivateRoute({ authed, children }: PrivateRouteProps) {
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export interface User {
  id: number;
  email: string;
}

export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { theme, setTheme } = useContext(ThemeContext);

  useEffect(() => {
    initAuth();
    const token = localStorage.getItem('ks_token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: decoded.sub, email: decoded.email });
      } catch (e) {
        localStorage.removeItem('ks_token');
      }
    }
    setLoaded(true);
  }, []);

  async function syncThemeFromBackend() {
    try {
      const r = await api.get('/user/appearance-settings');
      if (r.data && r.data.theme && setTheme) setTheme(r.data.theme);
    } catch {}
  }

  function onLogout() {
    setUser(null);
    setAuthToken(null);
    if (setTheme) setTheme('auto');
  }

  // Khi user login/register thành công, đồng bộ theme
  async function onAuthed(user: User) {
    setUser(user);
    await syncThemeFromBackend();
  }

  function showToast(message: string, type: ToastItem['type'] = 'info') {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }

  function handleToastClose(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  useEffect(() => {
    setToastHandler(showToast);
    return () => clearToastHandler();
  }, []);

  if (!loaded) {
    return (
      <div className={"min-h-screen flex items-center justify-center " + getThemeColor(theme, 'background')}>
        <div className={getThemeColor(theme, 'textSecondary')}>Loading...</div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <ToastContext.Provider value={{ show: showToast }}>
        <div className="min-h-screen">
          <NavBar user={user} onLogout={onLogout} />
          <Toast toasts={toasts} onClose={handleToastClose} />
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/login" element={<Login onAuthed={onAuthed} />} />
            <Route path="/register" element={<Register onAuthed={onAuthed} />} />
            <Route path="/vault" element={<PrivateRoute authed={!!user}><Vault /></PrivateRoute>} />
            <Route path="/notes" element={<PrivateRoute authed={!!user}><Notes /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute authed={!!user}><Profile /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute authed={!!user}><Settings /></PrivateRoute>} />
            <Route path="/breach" element={<PrivateRoute authed={!!user}><BreachMonitor /></PrivateRoute>} />
            <Route path="/wallet" element={<PrivateRoute authed={!!user}><Wallet /></PrivateRoute>} />
          </Routes>
        </div>
      </ToastContext.Provider>
    </LanguageProvider>
  );
}
