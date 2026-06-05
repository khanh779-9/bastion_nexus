import React, { useState, useEffect, useContext } from 'react';
import { api } from '@/api/client';
import { ShieldAlert, Search, Plus, Trash2, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { ThemeContext } from '@/components/ThemeContext';
import { useTranslate } from '@/locales';
import { getThemeColor } from '../themeColors';
import { showToast } from '@/components/toastService';

interface BreachMonitorItem {
  id: number;
  monitor_type: string;
  monitor_value: string;
  status: string;
  created_at: string;
  updated_at: string;
  breached: boolean;
  breach_source: string | null;
  checked_at: string | null;
}

export default function BreachMonitor() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [monitors, setMonitors] = useState<BreachMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState('');
  const [type, setType] = useState('email');
  const [checking, setChecking] = useState(false);

  // Theme classes
  const mainClass = 'min-h-screen ' + getThemeColor(theme, 'background');
  const cardClass = getThemeColor(theme, 'card');
  const headingClass = getThemeColor(theme, 'cardTitle');
  const subHeadingClass = getThemeColor(theme, 'textSecondary');
  const inputClass = getThemeColor(theme, 'input');
  const btnClass = getThemeColor(theme, 'button');
  const modalBg = getThemeColor(theme, 'backgroundSecondary');
  const borderClass = getThemeColor(theme, 'border');

  async function load() {
    try {
      const { data } = await api.get('/breach/monitor');
      setMonitors(data);
    } catch (e) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addMonitor(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    
    setChecking(true);
    try {
      const payload = {
        monitor_type: type,
        monitor_value: value
      };
      
      // Auto-detect override if simple
      if (type === 'email' && !value.includes('@') && !value.includes('.')) {
         payload.monitor_type = value.includes('@') ? 'email' : 'username';
      }

      await api.post('/breach/monitor', payload);
      showToast(t('messages.success'), 'success');
      setValue('');
      setShowModal(false);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('messages.error'), 'error');
    } finally {
      setChecking(false);
    }
  }

  async function deleteMonitor(id: number) {
    if (!confirm(t('vault.deleteConfirm'))) return;
    try {
      await api.delete(`/breach/monitor/${id}`);
      load();
    } catch (e) {
      showToast(t('messages.error'), 'error');
    }
  }

  return (
    <main className={mainClass}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-lg ${getThemeColor(theme, 'featureBreachIcon')}`}>
              <ShieldAlert size={32} className="text-current" />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${headingClass}`}>{t('breach.title')}</h1>
              <p className={`${subHeadingClass} mt-1`}>{t('breach.desc')}</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${btnClass}`}
          >
            <Plus size={20} />
            {t('breach.addMonitor')}
          </button>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="flex justify-center items-end gap-1 mb-6">
                <div className={`w-1.5 h-6 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0s'}}></div>
                <div className={`w-1.5 h-8 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.2s'}}></div>
                <div className={`w-1.5 h-10 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.4s'}}></div>
              </div>
              <p className={`${getThemeColor(theme, 'textSecondary')} font-medium`}>{t('messages.loading')}</p>
            </div>
          </div>
        ) : monitors.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${cardClass}`}>
            <ShieldAlert size={48} className={`mx-auto mb-4 ${getThemeColor(theme, 'featureBreachText')}`} />
            <p className={subHeadingClass}>{t('breach.noMonitors')}</p>
            <button 
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors"
            >
              {t('breach.addMonitor')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {monitors.map(m => (
              <div key={m.id} className={`p-5 rounded-xl shadow transition-all ${cardClass}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${m.breached ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                      {m.breached ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${headingClass}`}>{m.monitor_value}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 capitalize`}>
                          {m.monitor_type}
                        </span>
                        <span className={`text-xs ${subHeadingClass}`}>
                          {t('breach.date')}: {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        {m.breached ? (
                          <div className="text-red-500 text-sm font-medium flex items-center gap-2">
                             <XCircle size={16} />
                             {t('breach.breached')} 
                             {m.breach_source && <span className="text-xs opacity-75">({t('breach.source')}: {m.breach_source})</span>}
                          </div>
                        ) : (
                          <div className="text-green-500 text-sm font-medium flex items-center gap-2">
                             <CheckCircle size={16} />
                             {t('breach.safe')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteMonitor(m.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('vault.delete')}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${modalBg} ${borderClass} border`}>
            <h2 className={`text-2xl font-bold mb-6 ${headingClass}`}>{t('breach.addMonitor')}</h2>
            
            <form onSubmit={addMonitor} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${subHeadingClass}`}>{t('vault.type')}</label>
                <select 
                  value={type} 
                  onChange={e => setType(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                >
                  <option value="email">Email</option>
                  <option value="phone">{t('profile.phone') || 'Phone Number'}</option>
                  <option value="wallet">{t('wallet.address') || 'Wallet Address'}</option>
                  <option value="password">{t('vault.password') || 'Password'}</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${subHeadingClass}`}>{t('breach.enterValue')}</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${subHeadingClass}`} size={20} />
                  <input 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                    placeholder={type === 'email' ? "your@email.com" : "username123"}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${getThemeColor(theme, 'buttonSecondary')}`}
                >
                  {t('notes.cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={checking || !value}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${checking ? 'opacity-75 cursor-not-allowed' : ''} ${btnClass}`}
                >
                  {checking ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
                  {t('breach.monitor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
