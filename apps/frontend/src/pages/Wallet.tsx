import React, { useState, useEffect, useContext, FormEvent } from 'react';
import { api } from '@/api/client';
import {
  Wallet as WalletIcon,
  Plus,
  CreditCard,
  Key,
  Landmark,
  User,
  Trash2,
  Edit2,
  Eye,
  X,
  Save,
  Wifi
} from 'lucide-react';
import { ThemeContext } from '@/components/ThemeContext';
import { useTranslate } from '@/locales';
import { getThemeColor } from '../themeColors';
import { showToast } from '@/components/toastService';

export interface WalletItemMetadata {
  expiry?: string;
  cvv?: string;
  holder?: string;
  provider?: string;
}

export interface WalletItem {
  id: number;
  wallet_type: 'crypto' | 'card' | 'id_card' | 'bank_account' | 'other';
  name: string;
  address?: string | null;
  secret?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  metadata?: WalletItemMetadata;
}

export interface WalletFormState {
  wallet_type: string;
  name: string;
  address: string;
  secret: string;
  description: string;
  metadata: {
    expiry: string;
    cvv: string;
    holder: string;
    provider?: string;
  };
}

interface WalletFormProps {
  form: WalletFormState;
  setForm: React.Dispatch<React.SetStateAction<WalletFormState>>;
  readOnly?: boolean;
  isEditing?: boolean;
  isRevealed?: boolean;
  setIsRevealed?: (revealed: boolean) => void;
  copyToClipboard: (text: string) => void;
}

// Generic Form Component
const WalletForm = ({
  form,
  setForm,
  readOnly = false,
  isRevealed = false,
  setIsRevealed,
  copyToClipboard
}: WalletFormProps) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();

  const borderClass = getThemeColor(theme, 'border');
  const textClass = getThemeColor(theme, 'textSecondary');
  const inputClass = getThemeColor(theme, 'input');

  return (
    <div className="space-y-3">
      {/* Type & Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('vault.type')}</label>
          <select
            className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 text-sm ${inputClass}`}
            value={form.wallet_type}
            onChange={e => setForm({ ...form, wallet_type: e.target.value })}
            disabled={readOnly}
          >
            <option value="card">{t('wallet.card')}</option>
            <option value="id_card">{t('wallet.idCard')}</option>
            <option value="crypto">{t('wallet.crypto')}</option>
            <option value="bank_account">{t('wallet.bank')}</option>
            <option value="other">{t('wallet.other')}</option>
          </select>
        </div>
        <div>
          <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('vault.name')}</label>
          <input
            className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 text-sm ${inputClass}`}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            readOnly={readOnly}
            required
          />
        </div>
      </div>

      {/* Conditional Fields based on Type */}
      {form.wallet_type === 'card' ? (
        <div className={`p-3 rounded-xl border ${borderClass} ${getThemeColor(theme, 'backgroundSecondary')} space-y-2`}>
          <div>
            <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('wallet.cardNumber')}</label>
            <div className="relative">
              <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 ${getThemeColor(theme, 'icon')}`} size={14} />
              <input
                className={`w-full pl-9 pr-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 font-mono text-sm ${inputClass}`}
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                readOnly={readOnly}
                placeholder="0000 0000 0000 0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('wallet.expiry')}</label>
              <input
                className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 font-mono text-sm ${inputClass}`}
                placeholder="MM/YY"
                value={form.metadata.expiry}
                onChange={e => setForm({ ...form, metadata: { ...form.metadata, expiry: e.target.value } })}
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('wallet.cvv')}</label>
              <input
                className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 font-mono text-sm ${inputClass}`}
                value={form.metadata.cvv}
                onChange={e => setForm({ ...form, metadata: { ...form.metadata, cvv: e.target.value } })}
                readOnly={readOnly}
                placeholder="123"
              />
            </div>
          </div>
          <div>
            <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('wallet.holder')}</label>
            <input
              className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 uppercase text-sm ${inputClass}`}
              value={form.metadata.holder}
              onChange={e => setForm({ ...form, metadata: { ...form.metadata, holder: e.target.value } })}
              readOnly={readOnly}
            />
          </div>
        </div>
      ) : (
        <div>
          <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('wallet.address')}</label>
          <input
            className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 font-mono text-sm ${inputClass}`}
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Secret */}
      <div className={`p-3 rounded-xl border ${borderClass} bg-yellow-50/50 dark:bg-yellow-900/10`}>
        <div className="flex items-center justify-between mb-0.5">
          <label className={`block text-[10px] uppercase tracking-wider font-bold ${getThemeColor(theme, 'text')}`}>{t('wallet.secret')}</label>
          {readOnly && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRevealed && setIsRevealed(!isRevealed)}
                className={`text-xs hover:underline ${getThemeColor(theme, 'icon')}`}
              >
                {isRevealed ? t('vault.hide') : t('vault.show')}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(form.secret)}
                className={`text-xs hover:underline ${getThemeColor(theme, 'icon')}`}
              >
                {t('wallet.copy')}
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <textarea
            className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 font-mono text-sm tracking-wide ${inputClass} ${readOnly && !isRevealed ? 'text-gray-400' : ''} ${readOnly ? 'cursor-text ' : ''}`}
            rows={2}
            placeholder={t('wallet.secretPlaceholder')}
            value={readOnly && !isRevealed ? '•'.repeat(form.secret?.length || 10) : form.secret}
            onChange={e => setForm({ ...form, secret: e.target.value })}
            readOnly={readOnly}
            disabled={readOnly && !isRevealed}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${textClass}`}>{t('vault.description')}</label>
        <textarea
          className={`w-full px-3 py-1.5 rounded-lg border focus:ring-2 disabled:opacity-75 text-sm ${inputClass}`}
          rows={2}
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

export default function Wallet() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [items, setItems] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Data States
  const [currentItem, setCurrentItem] = useState<WalletItem | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // Form State for Add/Edit
  const initialForm: WalletFormState = {
    wallet_type: 'card',
    name: '',
    address: '',
    secret: '',
    description: '',
    metadata: { expiry: '', cvv: '', holder: '' }
  };
  const [form, setForm] = useState<WalletFormState>(initialForm);

  // Styles
  const mainClass = 'min-h-screen ' + getThemeColor(theme, 'background');
  const cardBg = getThemeColor(theme, 'backgroundSecondary');
  const borderClass = getThemeColor(theme, 'border');
  const textClass = getThemeColor(theme, 'textSecondary');
  const titleClass = getThemeColor(theme, 'cardTitle');
  const inputClass = getThemeColor(theme, 'input');

  async function load() {
    try {
      const { data } = await api.get<WalletItem[]>('/wallet/items');
      setItems(data);
    } catch {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Filter Logic
  const filteredItems = items.filter(item => {
    const nameMatch = item.name?.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const typeMatch = !typeFilter || item.wallet_type === typeFilter;
    return nameMatch && typeMatch;
  });

  // Handlers
  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/wallet/items', form);
      showToast(t('messages.success'), 'success');
      setShowAddModal(false);
      resetForm();
      load();
    } catch {
      showToast(t('messages.error'), 'error');
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!currentItem) return;
    try {
      await api.put(`/wallet/items/${currentItem.id}`, form);
      showToast(t('vault.updatedSuccess'), 'success');
      setShowDetailModal(false);
      setCurrentItem(null);
      load();
    } catch {
      showToast(t('messages.error'), 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t('vault.deleteConfirm'))) return;
    try {
      await api.delete(`/wallet/items/${id}`);
      load();
      if (showDetailModal && currentItem?.id === id) setShowDetailModal(false);
    } catch {
      showToast(t('messages.error'), 'error');
    }
  }

  async function openDetail(id: number, viewOnly = true) {
    try {
      const { data } = await api.get<WalletItem>(`/wallet/items/${id}`);
      setCurrentItem(data);
      // Map API data to form structure
      setForm({
        wallet_type: data.wallet_type,
        name: data.name,
        address: data.address || '',
        secret: data.secret || '',
        description: data.description || '',
        metadata: {
          expiry: data.metadata?.expiry || '',
          cvv: data.metadata?.cvv || '',
          holder: data.metadata?.holder || ''
        }
      });
      setIsViewOnly(viewOnly);
      setIsRevealed(false);
      setShowDetailModal(true);
    } catch {
      showToast(t('messages.error'), 'error');
    }
  }

  function resetForm() {
    setForm(initialForm);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    showToast(t('wallet.copied'), 'success');
  }

  // Render Helpers
  function getIcon(type: string) {
    switch (type) {
      case 'card':
        return <CreditCard size={24} />;
      case 'crypto':
        return <Key size={24} />;
      case 'bank_account':
        return <Landmark size={24} />;
      case 'id_card':
        return <User size={24} />;
      default:
        return <WalletIcon size={24} />;
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'card':
        return t('wallet.card');
      case 'id_card':
        return t('wallet.idCard');
      case 'crypto':
        return t('wallet.crypto');
      case 'bank_account':
        return t('wallet.bank');
      default:
        return t('wallet.other');
    }
  }

  function renderCard(item: WalletItem) {
    // Premium Credit Card Style
    if (item.wallet_type === 'card') {
      return (
        <div className="group relative h-60 perspective-1000">
          {/* Card Visual - Front */}
          <div
            className={`
              relative h-full rounded-2xl p-6 flex flex-col justify-between overflow-hidden text-white shadow-2xl transition-all duration-500 ease-out transform group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.4)]
              bg-gradient-to-bl from-gray-900 via-indigo-900 to-violet-900
            `}
          >
            {/* Decorative Mesh/Noise Background */}
            <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-cover"></div>
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 translate-x-[-100%] transition-transform duration-1000 group-hover:translate-x-[100%] blur-3xl"></div>

            {/* Card Header */}
            <div className="relative z-10 flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60 mb-1">{t('wallet.card')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-5 rounded bg-gradient-to-r from-yellow-200 to-yellow-500 opacity-90 shadow-sm border border-yellow-600/30 flex relative overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="w-1/3 h-full border-r border-black/10"></div>
                      <div className="w-1/3 h-full border-r border-black/10"></div>
                    </div>
                    <div className="absolute inset-0 flex flex-col">
                      <div className="h-1/2 w-full border-b border-black/10"></div>
                    </div>
                  </div>
                  <Wifi size={16} className="text-white/50 rotate-90" />
                </div>
              </div>
              <div className="text-white/90 font-bold italic tracking-wider text-lg opacity-80">{item.metadata?.provider || 'VISA'}</div>
            </div>

            {/* Card Number & Info */}
            <div className="relative z-10 space-y-5">
              <div className="font-mono text-xl sm:text-2xl tracking-widest text-shadow-sm truncate py-1">
                {item.address || '•••• •••• •••• ••••'}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-white/60 mb-0.5">{t('wallet.holder')}</p>
                  <p className="font-medium tracking-wide truncate max-w-[140px] uppercase text-sm">{item.metadata?.holder || 'NAME'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-white/60 mb-0.5">{t('wallet.expiry')}</p>
                  <p className="font-mono font-medium tracking-wider text-sm">{item.metadata?.expiry || 'MM/YY'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Actions - Static below card */}
          <div className="flex justify-end gap-3 mt-4 sm:hidden px-1">
            <button
              onClick={() => openDetail(item.id, true)}
              className={`p-2.5 rounded-xl ${cardBg} border ${borderClass} text-blue-500 shadow-sm active:scale-95 transition-transform`}
            >
              <Eye size={20} />
            </button>
            <button
              onClick={() => openDetail(item.id, false)}
              className={`p-2.5 rounded-xl ${cardBg} border ${borderClass} ${textClass} shadow-sm active:scale-95 transition-transform`}
            >
              <Edit2 size={20} />
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              className={`p-2.5 rounded-xl ${cardBg} border ${borderClass} text-red-500 shadow-sm active:scale-95 transition-transform`}
            >
              <Trash2 size={20} />
            </button>
          </div>

          {/* Desktop Actions - Hover Overlay Glassmorphism */}
          <div className="hidden sm:flex absolute inset-0 z-20 items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-sm rounded-2xl">
            <button
              onClick={() => openDetail(item.id, true)}
              className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg"
              title={t('wallet.view')}
            >
              <Eye size={22} />
            </button>
            <button
              onClick={() => openDetail(item.id, false)}
              className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg"
              title={t('notes.edit')}
            >
              <Edit2 size={22} />
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              className="p-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-full text-red-100 backdrop-blur-md transition-all hover:scale-110 shadow-lg"
              title={t('vault.delete')}
            >
              <Trash2 size={22} />
            </button>
          </div>
        </div>
      );
    }

    // Standard Style for Other Items - Minimalist & Clean
    const cardStyle = getThemeColor(theme, 'card');
    return (
      <div
        className={`group relative p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1 flex flex-col justify-between min-h-[14rem] ${cardStyle}`}
      >
        {/* Decoration Gradient Line */}
        <div className="absolute top-0 left-6 right-6 h-1 rounded-b-lg bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div>
          <div className="flex items-start justify-between mb-5">
            <div className={`p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300`}>
              {getIcon(item.wallet_type)}
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400`}>
              {getTypeLabel(item.wallet_type)}
            </span>
          </div>

          <h3 className={`text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
            {item.name}
          </h3>
          <p className={`text-sm text-gray-500 dark:text-gray-400 font-mono truncate opacity-80`}>{item.address || 'UID/Address...'}</p>

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <p className={`text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed`}>
              {item.description || t('wallet.noDescription')}
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 mt-4 pt-2 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => openDetail(item.id, true)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600`}
          >
            <Eye size={16} /> <span className="hidden xs:inline">{t('wallet.view')}</span>
          </button>
          <button
            onClick={() => openDetail(item.id, false)}
            className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-700/30 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
            title={t('notes.edit')}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-700/30 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors`}
            title={t('vault.delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={mainClass}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-lg ${getThemeColor(theme, 'featureWalletIcon')}`}>
              <WalletIcon size={32} className="text-current" />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${titleClass}`}>{t('wallet.title')}</h1>
              <p className={`${textClass} mt-1`}>{t('wallet.desc')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ${getThemeColor(theme, 'button')}`}
          >
            <Plus size={20} /> {t('wallet.add')}
          </button>
        </div>

        {/* Filters */}
        <div className={`mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border ${borderClass} ${getThemeColor(theme, 'backgroundSecondary')}`}>
          <input
            className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm ${inputClass}`}
            placeholder={`${t('vault.name')}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm ${inputClass}`}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">{t('navbar.all')}</option>
            <option value="card">{t('wallet.card')}</option>
            <option value="id_card">{t('wallet.idCard')}</option>
            <option value="crypto">{t('wallet.crypto')}</option>
            <option value="bank_account">{t('wallet.bank')}</option>
            <option value="other">{t('wallet.other')}</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="flex justify-center items-end gap-1 mb-6">
                <div className={`w-1.5 h-6 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{ animationDelay: '0s' }}></div>
                <div className={`w-1.5 h-8 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{ animationDelay: '0.2s' }}></div>
                <div className={`w-1.5 h-10 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className={`${getThemeColor(theme, 'textSecondary')} font-medium`}>{t('messages.loading')}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${cardBg} ${borderClass}`}>
            <WalletIcon size={48} className={`mx-auto mb-4 ${textClass}`} />
            <p className={textClass}>{t('wallet.noItems')}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${cardBg} ${borderClass}`}>
            <p className={textClass}>{t('wallet.noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div key={item.id}>{renderCard(item)}</div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`${cardBg} rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 border ${borderClass} max-h-[85vh] overflow-y-auto animate-scale-in`}>
              <h2 className={`text-xl font-bold mb-4 sm:mb-6 ${titleClass}`}>{t('wallet.add')}</h2>
              <form onSubmit={handleAdd}>
                <WalletForm form={form} setForm={setForm} copyToClipboard={copyToClipboard} />
                <div className="flex gap-3 mt-6 sm:mt-8">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${getThemeColor(theme, 'buttonSecondary')}`}
                  >
                    {t('notes.cancel')}
                  </button>
                  <button type="submit" className={`flex-1 py-3 rounded-xl font-semibold shadow-lg ${getThemeColor(theme, 'button')}`}>
                    {t('vault.add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail/Edit Modal */}
        {showDetailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`${cardBg} rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 border ${borderClass} max-h-[85vh] overflow-y-auto animate-scale-in`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-2xl font-bold ${titleClass}`}>{isViewOnly ? currentItem?.name : t('vault.editItem')}</h2>
                <div className="flex items-center gap-2">
                  {isViewOnly && (
                    <button
                      onClick={() => setIsViewOnly(false)}
                      className={`p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${textClass}`}
                      title={t('notes.edit')}
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className={`p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${textClass}`}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdate}>
                <WalletForm
                  isEditing={true}
                  readOnly={isViewOnly}
                  form={form}
                  setForm={setForm}
                  isRevealed={isRevealed}
                  setIsRevealed={setIsRevealed}
                  copyToClipboard={copyToClipboard}
                />

                {!isViewOnly && (
                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setIsViewOnly(true)}
                      className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${getThemeColor(theme, 'buttonSecondary')}`}
                    >
                      {t('notes.cancel')}
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 ${getThemeColor(theme, 'button')}`}
                    >
                      <Save size={20} /> {t('vault.save')}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
