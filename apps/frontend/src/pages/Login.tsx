import React, { useState, useContext } from 'react';
import { api, setAuthToken } from '@/api/client';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { ThemeContext } from '@/components/ThemeContext';
import { getThemeColor } from '../themeColors';
import { showToast } from '@/components/toastService';
import type { User } from '../App';

interface LoginProps {
  onAuthed: (user: User) => void;
}

export default function Login({ onAuthed }: LoginProps) {
  const { theme } = useContext(ThemeContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // Theme classes
  const mainClass = 'min-h-screen flex items-center justify-center ' + getThemeColor(theme, 'background');
  const cardBg = getThemeColor(theme, 'card');
  const headingClass = 'text-4xl font-bold mb-3 ' + getThemeColor(theme, 'text');
  const subheadingClass = getThemeColor(theme, 'textSecondary');
  const iconBg = 'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ' + getThemeColor(theme, 'backgroundSecondary');
  const iconColor = getThemeColor(theme, 'icon');
  const inputClass = 'w-full px-4 py-2.5 text-sm rounded-lg border ' + getThemeColor(theme, 'input') + ' ' + getThemeColor(theme, 'border') + ' focus:outline-none focus:ring-2 ' + getThemeColor(theme, 'focusRing') + ' transition-all';
  const btnClass = 'w-full py-2.5 px-4 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ' + getThemeColor(theme, 'button');
  const linkClass = getThemeColor(theme, 'link');
  const cardBorder = getThemeColor(theme, 'border');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuthToken(data.token);
      onAuthed(data.user);
      nav('/');
    } catch (e: any) {
      let msg = 'Login failed';
      if (e?.response?.data?.error) {
        if (typeof e.response.data.error === 'string') {
          msg = e.response.data.error;
        } else if (e.response.data.error.formErrors) {
          msg = Object.values(e.response.data.error.formErrors.fieldErrors || {}).join(', ');
        }
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={mainClass}>
      <div className="w-full px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-10">
            <div className={iconBg}>
              <LogIn size={32} className={iconColor} />
            </div>
            <h1 className={headingClass}>Welcome Back</h1>
            <p className={subheadingClass}>Sign in to access your secure vault</p>
          </div>
          <div className={"rounded-2xl shadow-xl p-8 " + cardBg + ' ' + cardBorder}>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className={"block text-sm font-medium mb-2 " + subheadingClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={"block text-sm font-medium mb-2 " + subheadingClass}>Password</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={btnClass}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className={"mt-8 pt-8 border-t " + cardBorder}>
              <p className={"text-center " + subheadingClass}>Don't have an account? <Link to="/register" className={linkClass + " font-normal"}>Create one</Link></p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
