import { useEffect, useState, useRef, useContext, FormEvent, MouseEvent } from 'react';
import { api } from '@/api/client';
import { Lock, Plus, Eye, Edit2, Trash2, Copy, EyeOff } from 'lucide-react';
import { ThemeContext } from '@/components/ThemeContext';
import { useTranslate } from '@/locales';
import { getThemeColor } from '../themeColors';
import { showToast } from '@/components/toastService';
import { generateTOTP } from '@/utils/totp';

export interface VaultItem {
  id: number;
  name: string;
  username?: string;
  email?: string;
  password?: string;
  otp_secret?: string;
  description?: string;
  type: 'website' | 'email' | 'server' | 'database' | 'application' | 'other';
  created_at?: string;
  updated_at: string;
}

export default function Vault() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    otp_secret: '',
    description: '',
    type: 'other'
  });
  const [addType, setAddType] = useState<'menu' | 'login' | 'identity' | 'card' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState('');
  const [otpTimer, setOtpTimer] = useState<Record<number, number>>({});
  const [totpCodes, setTotpCodes] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | globalThis.MouseEvent) {
      if (addType === 'menu' && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAddType(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addType]);

  // OTP timer effect with TOTP generation
  useEffect(() => {
    const currentRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    // Generate TOTP codes for all items with otp_secret
    items.forEach(item => {
      if (item.otp_secret) {
        setOtpTimer(prev => ({ ...prev, [item.id]: currentRemaining }));

        const p = generateTOTP(item.otp_secret);
        if (p) {
          p.then(code => {
            if (code) {
              setTotpCodes(prev => ({ ...prev, [item.id]: code }));
            }
          });
        }
      }
    });

    const interval = setInterval(() => {
      const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
      setOtpTimer(prev => {
        const updated = { ...prev };
        items.forEach(item => {
          if (item.otp_secret) updated[item.id] = remaining;
        });
        return updated;
      });

      // Regenerate TOTP codes every 30 seconds
      items.forEach(item => {
        if (item.otp_secret) {
          const p = generateTOTP(item.otp_secret);
          if (p) {
            p.then(code => {
              if (code) {
                setTotpCodes(prev => ({ ...prev, [item.id]: code }));
              }
            });
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [items]);

  async function load() {
    try {
      const { data } = await api.get<VaultItem[]>('/vault/items');
      setItems(data);
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('vault.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!form.name) {
      showToast(t('vault.nameRequired'), 'error');
      return;
    }
    try {
      await api.post('/vault/items', form);
      showToast(t('vault.addedSuccess'), 'success');
      setForm({
        name: '',
        username: '',
        email: '',
        password: '',
        otp_secret: '',
        description: '',
        type: 'other'
      });
      setShowModal(false);
      setAddType(null);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('vault.failedToAdd'), 'error');
    }
  }

  async function deleteItem(id: number) {
    if (!confirm(t('vault.deleteConfirm'))) return;
    try {
      await api.delete(`/vault/items/${id}`);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('vault.failedToDelete'), 'error');
    }
  }

  async function openDetailModal(id: number, viewOnly = false) {
    try {
      const { data } = await api.get<VaultItem>(`/vault/items/${id}`);
      setEditItem(data);
      setEditingId(id);
      setShowDetailModal(true);
      setIsViewOnly(viewOnly);
      // Initialize OTP timer
      setOtpTimer(prev => ({ ...prev, [id]: 30 - (Math.floor(Date.now() / 1000) % 30) }));
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('vault.failedToLoad'), 'error');
    }
  }

  async function updateItem(e: FormEvent) {
    e.preventDefault();
    if (!editItem || !editItem.name) {
      showToast(t('vault.nameRequired'), 'error');
      return;
    }
    try {
      await api.put(`/vault/items/${editingId}`, editItem);
      showToast(t('vault.updatedSuccess'), 'success');
      setShowDetailModal(false);
      setEditItem(null);
      setEditingId(null);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('vault.failedToAdd'), 'error');
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  function toggleRevealed(id: string) {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function getTypeLabel(type: string) {
    const typeMap: Record<string, string> = {
      'website': t('vault.typeWebsite'),
      'email': t('vault.typeEmail'),
      'server': t('vault.typeServer'),
      'database': t('vault.typeDatabase'),
      'application': t('vault.typeApplication'),
      'other': t('vault.typeOther')
    };
    return typeMap[type] || type;
  }

  const mainClass = 'min-h-screen ' + getThemeColor(theme, 'background');
  const modalBg = getThemeColor(theme, 'backgroundSecondary');
  const borderClass = getThemeColor(theme, 'border');
  const btnClass = 'flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ' + getThemeColor(theme, 'button');
  const menuBtnClass = 'block w-full text-left px-4 py-3 transition-colors ' + getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'textSecondary') + ' hover:' + getThemeColor(theme, 'background');
  const headingClass = getThemeColor(theme, 'cardTitle');
  const subheadingClass = getThemeColor(theme, 'cardDesc');

  const filteredItems = items.filter(item => {
    const nameMatch = item.name?.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const typeMatch = !typeFilter || item.type === typeFilter;

    const itemDate = item.updated_at ? new Date(item.updated_at) : null;
    const fromMatch = !dateFrom || (itemDate && itemDate >= new Date(dateFrom + 'T00:00:00'));
    const toMatch = !dateTo || (itemDate && itemDate <= new Date(dateTo + 'T23:59:59'));

    return nameMatch && typeMatch && fromMatch && toMatch;
  });

  return (
    <main className={mainClass}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-lg ${getThemeColor(theme, 'featureVaultIcon')}`}>
              <Lock size={32} className="text-current" />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${headingClass}`}>{t('vault.personalVault')}</h1>
              <p className={`${subheadingClass} mt-1`}>{t('vault.vaultDesc')}</p>
            </div>
          </div>
          <div className="relative">
            <button
              className={btnClass}
              onClick={e => {
                e.preventDefault();
                setAddType(addType ? null : 'menu');
              }}
            >
              <Plus size={20} />
              {t('vault.addItem')}
            </button>
            {addType === 'menu' && (
              <div ref={menuRef} className={`absolute right-0 mt-2 w-48 ${modalBg} rounded-lg shadow-lg z-40 border ${borderClass}`} style={{ minWidth: '12rem' }}>
                <button className={menuBtnClass} onClick={() => { setAddType('login'); setForm(prev => ({ ...prev, type: 'website' })); setShowModal(true); }}>
                  {t('vault.addLogin')}
                </button>
                <button className={menuBtnClass} onClick={() => { setAddType('identity'); setForm(prev => ({ ...prev, type: 'website' })); setShowModal(true); }}>
                  {t('vault.addIdentity')}
                </button>
                <button className={menuBtnClass} onClick={() => { setAddType('card'); setForm(prev => ({ ...prev, type: 'other' })); setShowModal(true); }}>
                  {t('vault.addCard')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={`mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-xl border ${borderClass} ${getThemeColor(theme, 'backgroundSecondary')}`}>
          <input
            className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
            placeholder={`${t('vault.name')}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="website">{t('vault.typeWebsite')}</option>
            <option value="email">{t('vault.typeEmail')}</option>
            <option value="server">{t('vault.typeServer')}</option>
            <option value="database">{t('vault.typeDatabase')}</option>
            <option value="application">{t('vault.typeApplication')}</option>
            <option value="other">{t('vault.typeOther')}</option>
          </select>
          <input
            type="date"
            className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        {/* Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className={`${modalBg} rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 border ${borderClass} max-h-[85vh] overflow-y-auto`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={"w-1 h-8 rounded-full " + getThemeColor(theme, 'accent')}></div>
                <h2 className={`text-xl font-bold ${headingClass}`}>
                  {addType === 'login' && t('vault.addLoginModal')}
                  {addType === 'identity' && t('vault.addIdentityModal')}
                  {addType === 'card' && t('vault.addCardModal')}
                </h2>
              </div>
              <form onSubmit={add} className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium ${subheadingClass} mb-1`}>{t('vault.type')} *</label>
                  <select
                    className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    required
                  >
                    <option value="website">{t('vault.typeWebsite')}</option>
                    <option value="email">{t('vault.typeEmail')}</option>
                    <option value="server">{t('vault.typeServer')}</option>
                    <option value="database">{t('vault.typeDatabase')}</option>
                    <option value="application">{t('vault.typeApplication')}</option>
                    <option value="other">{t('vault.typeOther')}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${subheadingClass} mb-1`}>{t('vault.name')} *</label>
                  <input
                    className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                    placeholder={t('vault.namePlaceholder')}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                {(addType === 'login' || addType === 'identity') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('login.username')}</label>
                      <input
                        className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                        placeholder={t('login.usernamePlaceholder')}
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('vault.email')}</label>
                      <input
                        className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                        placeholder={t('login.emailPlaceholder')}
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {addType === 'login' && (
                  <div>
                    <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('vault.password')}</label>
                    <input
                      type="password"
                      className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                      placeholder={t('login.passwordPlaceholder')}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                )}
                {addType === 'login' && (
                  <div>
                    <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('vault.otpSecret')}</label>
                    <input
                      className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                      placeholder={t('vault.otpPlaceholder')}
                      value={form.otp_secret}
                      onChange={e => setForm({ ...form, otp_secret: e.target.value })}
                    />
                  </div>
                )}
                {addType === 'card' && (
                  <div>
                    <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('vault.password')}</label>
                    <input
                      type="password"
                      className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                      placeholder="Card details..."
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('vault.description')} {t('messages.optional')}</label>
                  <textarea
                    className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                    placeholder={t('vault.descriptionPlaceholder')}
                    rows={2}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className={"flex-1 py-2 px-3 rounded-md font-semibold text-sm shadow-md hover:shadow-lg transition-all " + getThemeColor(theme, 'button')}
                  >
                    {t('vault.add')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setAddType(null); }}
                    className={"flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-colors " + getThemeColor(theme, 'buttonSecondary')}
                  >
                    {t('notes.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="flex justify-center items-end gap-1 mb-6">
                <div className={`w-1.5 h-6 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{ animationDelay: '0s' }}></div>
                <div className={`w-1.5 h-8 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{ animationDelay: '0.2s' }}></div>
                <div className={`w-1.5 h-10 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className={`${getThemeColor(theme, 'textSecondary')} font-medium`}>{t('vault.loading')}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className={"text-center py-20 rounded-2xl border-2 border-dashed " + getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'border')}>
            <Lock size={48} className={"mx-auto mb-4 " + getThemeColor(theme, 'textSecondary')} />
            <p className={getThemeColor(theme, 'textSecondary') + " text-lg mb-6"}>{t('vault.noItems')}</p>
            <button
              onClick={() => { setForm({ name: '', username: '', email: '', password: '', otp_secret: '', description: '', type: 'website' }); setAddType('login'); setShowModal(true); }}
              className={"inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold " + getThemeColor(theme, 'button')}
            >
              <Plus size={18} />
              {t('vault.addFirst')}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={"text-center py-16 rounded-2xl border-2 border-dashed " + getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'border')}>
            <p className={getThemeColor(theme, 'textSecondary') + " text-sm"}>{t('vault.noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={"rounded-xl shadow hover:shadow-lg transition-all overflow-hidden " + getThemeColor(theme, 'backgroundSecondary') + ' border ' + getThemeColor(theme, 'border')}
              >
                <div className="p-3 space-y-2">
                  {/* Type */}
                  <div>
                    <span className={"inline-flex text-xs font-semibold px-2.5 py-1 rounded-full " + getThemeColor(theme, 'accent') + ' ' + getThemeColor(theme, 'accentText')}>
                      {getTypeLabel(item.type)}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className={"text-lg font-bold truncate " + getThemeColor(theme, 'cardTitle')}>{item.name}</h3>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => openDetailModal(item.id, true)}
                        className={"p-2 rounded-lg transition-all " + getThemeColor(theme, 'backgroundSecondary') + ' hover:' + getThemeColor(theme, 'accent')}
                        title={t('vault.view')}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openDetailModal(item.id, false)}
                        className={"p-2 rounded-lg transition-all " + getThemeColor(theme, 'backgroundSecondary') + ' hover:' + getThemeColor(theme, 'accent')}
                        title={t('notes.edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className={"p-2 rounded-lg transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"}
                        title={t('vault.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className={"text-sm leading-relaxed " + getThemeColor(theme, 'cardDesc')}>{item.description}</p>
                  )}

                  {/* TOTP Code */}
                  {totpCodes[item.id] && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={"text-xl font-semibold font-mono tracking-wide " + getThemeColor(theme, 'cardTitle')}>
                          {totpCodes[item.id]}
                        </span>
                        <button
                          onClick={() => copyToClipboard(totpCodes[item.id], `totp-${item.id}`)}
                          className={"p-2 rounded-md transition-all " + getThemeColor(theme, 'backgroundSecondary') + ' hover:' + getThemeColor(theme, 'accent')}
                          title={t('vault.copy')}
                        >
                          {copied === `totp-${item.id}` ? '✓' : <Copy size={18} />}
                        </button>
                      </div>

                      {/* Circular Timer */}
                      <div className="relative w-16 h-10 flex items-center justify-center">
                        <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="36" fill="none" className={getThemeColor(theme, 'backgroundSecondary')} strokeWidth="2" />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            fill="none"
                            className="stroke-green-500 transition-all"
                            strokeWidth="3"
                            strokeDasharray={`${((otpTimer[item.id] || 0) / 30) * 226.2} 226.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="relative z-10 flex flex-col items-center">
                          <span className={`text-sm font-semibold ${getThemeColor(theme, 'textSecondary')}`}>
                            {otpTimer[item.id] || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={"flex items-center justify-between pt-2 border-t text-xs " + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'textSecondary')}>
                    <span>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ''}</span>
                    <span>{item.updated_at ? new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail/Edit Modal */}
      {showDetailModal && editItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`${modalBg} rounded-2xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 border ${borderClass} max-h-[85vh] overflow-y-auto`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={"w-1 h-8 rounded-full " + getThemeColor(theme, 'accent')}></div>
              <h2 className={`text-xl font-bold ${headingClass}`}>{t('vault.editItem')}</h2>
            </div>
            <form onSubmit={isViewOnly ? (e) => e.preventDefault() : updateItem} className="space-y-3">
              <div>
                <label className={`block text-xs font-medium ${subheadingClass} mb-1`}>{t('vault.type')} *</label>
                <select
                  className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                  value={editItem.type || 'other'}
                  onChange={e => setEditItem({ ...editItem, type: e.target.value as any })}
                  disabled={isViewOnly}
                  required
                >
                  <option value="website">{t('vault.typeWebsite')}</option>
                  <option value="email">{t('vault.typeEmail')}</option>
                  <option value="server">{t('vault.typeServer')}</option>
                  <option value="database">{t('vault.typeDatabase')}</option>
                  <option value="application">{t('vault.typeApplication')}</option>
                  <option value="other">{t('vault.typeOther')}</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium ${subheadingClass} mb-1`}>{t('vault.name')} *</label>
                <input
                  className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                  placeholder={t('vault.namePlaceholder')}
                  value={editItem.name || ''}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                  readOnly={isViewOnly}
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-medium ${subheadingClass} mb-1`}>{t('vault.account')}</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                    placeholder={t('login.usernamePlaceholder')}
                    value={editItem.username || ''}
                    onChange={e => setEditItem({ ...editItem, username: e.target.value })}
                    readOnly={isViewOnly}
                  />
                  <input
                    className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                    placeholder={t('login.emailPlaceholder')}
                    value={editItem.email || ''}
                    onChange={e => setEditItem({ ...editItem, email: e.target.value })}
                    readOnly={isViewOnly}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium ${subheadingClass} mb-1`}>{t('vault.password')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type={revealed[`pwd-${editingId}`] ? 'text' : 'password'}
                    className={"flex-1 px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                    placeholder={t('login.passwordPlaceholder')}
                    value={editItem.password || ''}
                    onChange={e => setEditItem({ ...editItem, password: e.target.value })}
                    readOnly={isViewOnly}
                  />
                  <button
                    type="button"
                    onClick={() => toggleRevealed(`pwd-${editingId}`)}
                    className={"p-2 rounded-lg transition-all " + getThemeColor(theme, 'backgroundSecondary')}
                  >
                    {revealed[`pwd-${editingId}`] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(editItem.password || '', `pwd-${editingId}`)}
                    className={"p-2 rounded-lg transition-all " + getThemeColor(theme, 'backgroundSecondary')}
                  >
                    {copied === `pwd-${editingId}` ? '✓' : <Copy size={18} />}
                  </button>
                </div>
              </div>
              {editItem.otp_secret && (
                <div>
                  <label className={`block text-xs font-medium ${subheadingClass} mb-1`}>{t('vault.otpSecret')}</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type={revealed[`otp-${editingId}`] ? 'text' : 'password'}
                        className={"flex-1 px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all font-mono text-sm " + getThemeColor(theme, 'input')}
                        value={editItem.otp_secret || ''}
                        onChange={e => setEditItem({ ...editItem, otp_secret: e.target.value })}
                        readOnly={isViewOnly}
                      />
                      <button
                        type="button"
                        onClick={() => toggleRevealed(`otp-${editingId}`)}
                        className={"p-2 rounded-lg transition-all " + getThemeColor(theme, 'backgroundSecondary')}
                      >
                        {revealed[`otp-${editingId}`] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editItem.otp_secret || '', `otp-${editingId}`)}
                        className={"p-2 rounded-lg transition-all " + getThemeColor(theme, 'backgroundSecondary')}
                      >
                        {copied === `otp-${editingId}` ? '✓' : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('vault.description')} {t('messages.optional')}</label>
                <textarea
                  className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                  placeholder={t('vault.descriptionPlaceholder')}
                  rows={2}
                  value={editItem.description || ''}
                  onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                  readOnly={isViewOnly}
                />
              </div>
              <div className="flex gap-2 pt-2">
                {!isViewOnly && (
                  <button
                    type="submit"
                    className={"flex-1 py-2 px-3 rounded-md font-semibold text-sm shadow-md hover:shadow-lg transition-all " + getThemeColor(theme, 'button')}
                  >
                    {t('vault.save')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowDetailModal(false); setEditItem(null); setEditingId(null); setIsViewOnly(false); }}
                  className={"flex-1 py-2 px-3 rounded-md font-semibold text-sm transition-colors " + getThemeColor(theme, 'buttonSecondary')}
                >
                  {t('notes.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
