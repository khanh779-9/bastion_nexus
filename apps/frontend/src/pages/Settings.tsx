import React, { useState, useContext, useEffect } from 'react';
import { getThemeColor } from '../themeColors';
import { api } from '@/api/client';
import { ThemeContext } from '@/components/ThemeContext';
import { useTranslate } from '@/locales';
import { showToast } from '@/components/toastService';

const TABS = [
  { key: 'appearance', labelKey: 'settings.appearance' },
  { key: 'account', labelKey: 'settings.account' },
  { key: 'sessions', labelKey: 'settings.sessions' },
  { key: 'devices', labelKey: 'settings.devices' },
  { key: 'users', labelKey: 'settings.users' },
];

export default function Settings() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [tab, setTab] = useState('appearance');
  
  const mainClass = 'mx-auto mt-10 rounded-2xl shadow-lg max-w-full md:max-w-3xl lg:max-w-4xl min-w-0 overflow-hidden flex flex-col md:flex-row ' + getThemeColor(theme, 'panel') + ' border ' + getThemeColor(theme, 'border');

  return (
    <main className={"min-h-screen " + getThemeColor(theme, 'background')}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20 flex justify-center">
        <div className={mainClass + ' w-full'} style={{ height: '600px', minHeight: '600px' }}>
          {/* Tab bar ngang trên mobile, sidebar dọc trên desktop */}
          <div className="w-full md:w-[220px] lg:w-[240px] xl:w-[260px] shrink-0"> 
            {/* Mobile: tab bar ngang, vuốt ngang */}
            <div className={`flex md:hidden overflow-x-auto scrollbar-thin border-b ${getThemeColor(theme, 'border')}`}> 
              {TABS.map(tabItem => (
                <button
                  key={tabItem.key}
                  onClick={() => setTab(tabItem.key)}
                  className={`min-w-[120px] px-4 py-3 text-sm font-semibold transition-colors ${tab === tabItem.key ? getThemeColor(theme, 'button') + ' border-b-2' : getThemeColor(theme, 'textSecondary') + ' hover:' + getThemeColor(theme, 'backgroundSecondary')}`}
                >
                  {tabItem.labelKey ? t(tabItem.labelKey) : tabItem.key}
                </button>
              ))}
            </div>
            {/* Desktop: sidebar dọc */}
            <div className={`hidden md:flex flex-col gap-1 h-full border-r py-8 rounded-tl-2xl rounded-bl-2xl ${getThemeColor(theme, 'border')}`}> 
              {TABS.map(tabItem => (
                <button
                  key={tabItem.key}
                  onClick={() => setTab(tabItem.key)}
                  className={`w-full text-left px-6 py-3 text-sm font-semibold rounded-l-xl transition-colors ${tab === tabItem.key ? getThemeColor(theme, 'button') : getThemeColor(theme, 'textSecondary') + ' hover:' + getThemeColor(theme, 'backgroundSecondary')}`}
                >
                  {tabItem.labelKey ? t(tabItem.labelKey) : tabItem.key}
                </button>
              ))}
            </div>
          </div>
          {/* Tabpage */}
          <div className="flex-1 p-4 md:p-8 min-w-0 h-full rounded-b-2xl md:rounded-bl-none md:rounded-r-2xl overflow-y-auto scrollbar-thin"> 
            {tab === 'account' && <AccountSettings />}
            {tab === 'sessions' && <SessionsSettings />}
            {tab === 'devices' && <DevicesSettings />}
            {tab === 'users' && <UsersSettings />}
            {tab === 'appearance' && <AppearanceSettings />}
          </div>
        </div>
      </section>
    </main>
  );
}

function AppearanceSettings() {
  const { theme: ctxTheme, setTheme: setCtxTheme } = useContext(ThemeContext);
  const { language, changeLanguage, t } = useTranslate();
  const [theme, setTheme] = useState(ctxTheme || 'auto');
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [fontType, setFontType] = useState('400');
  const [fontName, setFontName] = useState('');
  const [fontSize, setFontSize] = useState('16');
  const [loading, setLoading] = useState(true);

  // Lấy settings từ backend khi mở tab
  useEffect(() => {
    setLoading(true);
    api.get('/user/appearance-settings')
      .then(res => {
        if (res.data.theme) {
          setTheme(res.data.theme);
          if (setCtxTheme) setCtxTheme(res.data.theme);
        }
        if (res.data.font_type) setFontType(res.data.font_type);
        if (res.data.font_name) setFontName(res.data.font_name);
        if (res.data['font-size']) setFontSize(res.data['font-size']);
        if (res.data.language) {
          setCurrentLanguage(res.data.language);
          changeLanguage(res.data.language);
        }
        document.body.style.fontFamily = (res.data.font_name || 'sans-serif');
        document.body.style.fontWeight = (res.data.font_type || '400');
        document.body.style.fontSize = (res.data['font-size'] || '16') + 'px';
      })
      .finally(() => setLoading(false));
  }, []);

  const fontTypeOptions = [
    { value: '400', label: 'Normal' },
    { value: '300', label: 'Light' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: '700', label: 'Bold' },
  ];

  const googleFonts = [
    { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
    { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
    { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
    { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
    { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
    { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
    { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
    { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
    { value: 'Lora', label: 'Lora', category: 'Serif' },
    { value: 'Roboto Mono', label: 'Roboto Mono', category: 'Monospace' },
    { value: 'Source Code Pro', label: 'Source Code Pro', category: 'Monospace' },
    { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Monospace' },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
    { value: 'auto', label: t('settings.auto') },
  ];

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const data = {
      'theme': theme,
      'font_type': fontType,
      'font_name': fontName,
      'font-size': fontSize,
      'language': currentLanguage
    };
    api.post('/user/appearance-settings', data)
      .then(() => {
        showToast(t('settings.saved'), 'success');
        if (setCtxTheme) setCtxTheme(theme);
        changeLanguage(currentLanguage);
        document.body.style.fontFamily = fontName || 'sans-serif';
        document.body.style.fontWeight = fontType;
        document.body.style.fontSize = fontSize + 'px';
        setTimeout(() => window.location.reload(), 1500);
      })
      .catch(() => showToast(t('settings.saveFailed'), 'error'))
      .finally(() => setLoading(false));
  }

  if (loading) return <div>{t('settings.loading')}</div>;

  return (
    <form className="space-y-6 max-w-lg mx-auto" onSubmit={handleSave}>
      <div>
        <label className={"block text-sm font-normal mb-2 " + getThemeColor(ctxTheme, 'textSecondary')}>{t('settings.theme')}</label>
        <div className="flex gap-4">
          {themeOptions.map(opt => (
            <label key={opt.value} className={"inline-flex items-center gap-1 " + getThemeColor(ctxTheme, 'textSecondary')}>
              <input type="radio" name="theme" value={opt.value} checked={theme === opt.value} onChange={() => setTheme(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={"block text-sm font-normal mb-2 " + getThemeColor(ctxTheme, 'textSecondary')}>{t('settings.fontType')}</label>
        <select className={"w-full px-3 py-2 rounded-md border text-sm " + getThemeColor(ctxTheme, 'input') + ' ' + getThemeColor(ctxTheme, 'card')} value={fontType} onChange={e => setFontType(e.target.value)}>
          {fontTypeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={"block text-sm font-normal mb-2 " + getThemeColor(ctxTheme, 'textSecondary')}>{t('settings.fontName')}</label>
        <select className={"w-full px-3 py-2 rounded-md border text-sm " + getThemeColor(ctxTheme, 'input') + ' ' + getThemeColor(ctxTheme, 'card')} value={fontName} onChange={e => setFontName(e.target.value)}>
          <option value="">Default (System)</option>
          <optgroup label="Sans-serif">
            {googleFonts.filter(f => f.category === 'Sans-serif').map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </optgroup>
          <optgroup label="Serif">
            {googleFonts.filter(f => f.category === 'Serif').map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </optgroup>
          <optgroup label="Monospace">
            {googleFonts.filter(f => f.category === 'Monospace').map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </optgroup>
        </select>
      </div>
      <div>
        <label className={"block text-sm font-normal mb-2 " + getThemeColor(ctxTheme, 'textSecondary')}>{t('settings.fontSize')}</label>
        <input type="number" min="10" max="48" className={"w-32 px-3 py-2 rounded-md border text-sm " + getThemeColor(ctxTheme, 'input')} value={fontSize} onChange={e => setFontSize(e.target.value)} />
        <span className={"ml-2 " + getThemeColor(ctxTheme, 'textSecondary')}>{t('settings.px')}</span>
      </div>
      <div>
        <label className={"block text-sm font-normal mb-2 " + getThemeColor(ctxTheme, 'textSecondary')}>{t('settings.language')}</label>
        <select className={"w-full px-3 py-2 rounded-md border text-sm " + getThemeColor(ctxTheme, 'input') + ' ' + getThemeColor(ctxTheme, 'card')} value={currentLanguage} onChange={e => setCurrentLanguage(e.target.value)}>
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </div>
      <button type="submit" className={"w-full py-2 rounded-md font-semibold transition-colors " + getThemeColor(ctxTheme, 'button')}>{t('settings.save')}</button>
    </form>
  );
}

function AccountSettings() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    setProfileLoading(true);
    api.get('/user/profile')
      .then(res => {
        const user = res.data || {};
        setEmail(user.email || '');
      })
      .finally(() => setProfileLoading(false));
  }, []);

  function handleDeleteAccount() {
    if (!window.confirm(t('settings.deleteAccountWarning'))) return;
    setLoading(true);
    api.delete('/user/delete-account')
      .then(() => {
        showToast(t('settings.deleteAccountSuccess'), 'success');
        setTimeout(() => {
          localStorage.removeItem('ks_token');
          window.location.href = '/login';
        }, 1500);
      })
      .catch(err => showToast(err?.response?.data?.error || t('settings.deleteAccountError'), 'error'))
      .finally(() => setLoading(false));
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== repeatPassword) {
      showToast(t('settings.passwordMismatch'), 'error');
      return;
    }
    setLoading(true);
    api.post('/user/settings', {
      email: email || undefined,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined
    })
      .then(() => {
        showToast(t('settings.updateSuccess'), 'success');
        setCurrentPassword(''); setNewPassword(''); setRepeatPassword('');
      })
      .catch(err => {
        showToast(err?.response?.data?.error || t('settings.updateError'), 'error');
      })
      .finally(() => setLoading(false));
  }

  if (profileLoading) return <div>{t('settings.loadingProfile')}</div>;

  return (
    <form className="space-y-5" onSubmit={handleUpdate}>
      <div className={"pt-2 border-t " + getThemeColor(theme, 'border')}>
        <label className={"block text-sm font-normal mb-2 " + getThemeColor(theme, 'textSecondary')}>{t('settings.email')}</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className={"w-full px-3 py-2 rounded-md border text-sm " + getThemeColor(theme, 'input')} />
      </div>
      <div className={"pt-2 border-t " + getThemeColor(theme, 'border')}>
        <label className={"block text-sm font-normal mb-2 " + getThemeColor(theme, 'textSecondary')}>{t('settings.changePassword')}</label>
        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder={t('settings.currentPassword')} className={"w-full px-3 py-2 mb-2 rounded-md border text-sm " + getThemeColor(theme, 'input')} />
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} className={"w-full px-3 py-2 mb-2 rounded-md border text-sm " + getThemeColor(theme, 'input')} />
        <input type="password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} placeholder={t('settings.repeatPassword')} className={"w-full px-3 py-2 rounded-md border text-sm " + getThemeColor(theme, 'input')} />
      </div>
      <button type="submit" disabled={loading} className={"w-full py-2 rounded-md font-semibold transition-colors " + getThemeColor(theme, 'button')}> {loading ? t('settings.updating') : t('settings.update')} </button>
      <fieldset className={"mt-8 border-2 rounded-xl p-5 " + getThemeColor(theme, 'border')}>
        <legend className={"px-2 text-base font-semibold " + getThemeColor(theme, 'dangerText')}>{t('settings.deleteAccount')}</legend>
        <div className={"mb-3 text-sm " + getThemeColor(theme, 'dangerText')}>
          <strong>{t('settings.warning')}:</strong> {t('settings.deleteAccountWarningDetail')}
        </div>
        <button
          type="button"
          className={"w-full py-2 rounded-md font-semibold transition-colors " + getThemeColor(theme, 'buttonDanger')}
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          {t('settings.deleteAccountPermanent')}
        </button>
      </fieldset>
    </form>
  );
}

interface SessionItem {
  id: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  last_activity_at: string | null;
  revoked_at: string | null;
}

function SessionsSettings() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  function load() {
    setLoading(true);
    api.get('/user/sessions')
      .then(res => setSessions(res.data))
      .catch(() => showToast(t('settings.sessionsLoadFailed'), 'error'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function revoke(id: number) {
    if (!window.confirm(t('settings.sessionsConfirmRevoke'))) return;
    setRemoving(id);
    api.delete(`/user/sessions/${id}`)
      .then(() => load())
      .catch(() => showToast(t('settings.sessionsRevokeFailed'), 'error'))
      .finally(() => setRemoving(null));
  }

  if (loading) return <div>{t('settings.sessionsLoading')}</div>;
  if (!sessions.length) return <div>{t('settings.sessionsEmpty')}</div>;

  return (
    <div>
      <div className={"mb-2 text-sm " + getThemeColor(theme, 'textSecondary')}>{t('settings.sessionsRecent')}</div>
      <div className="overflow-x-auto">
        <table className={"min-w-full text-sm border " + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'backgroundSecondary')}>
          <thead>
            <tr className={getThemeColor(theme, 'backgroundSecondary')}>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.sessionsIp')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.sessionsDevice')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.sessionsStarted')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.sessionsLastActive')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.sessionsStatus')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} className={s.revoked_at ? 'opacity-60' : ''}>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{s.ip_address || '-'}</td>
                <td className={"px-3 py-2 border max-w-[180px] truncate " + getThemeColor(theme, 'border')} title={s.user_agent || ''}>{s.user_agent?.slice(0, 40) || '-'}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{s.created_at ? new Date(s.created_at).toLocaleString() : '-'}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{s.last_activity_at ? new Date(s.last_activity_at).toLocaleString() : '-'}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{s.revoked_at ? t('settings.sessionsRevoked') : t('settings.sessionsActive')}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>
                  {!s.revoked_at && (
                    <button
                      className={"px-2 py-1 text-xs rounded font-semibold transition-colors " + getThemeColor(theme, 'buttonDanger') + ' disabled:opacity-50'}
                      onClick={() => revoke(s.id)}
                      disabled={removing === s.id}
                    >
                      {removing === s.id ? t('settings.sessionsRevoking') : t('settings.sessionsRevoke')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DeviceItem {
  id: number;
  name: string | null;
  fingerprint: string | null;
  trusted: boolean;
  last_used_at: string | null;
}

function DevicesSettings() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  function load() {
    setLoading(true);
    api.get('/user/devices')
      .then(res => setDevices(res.data))
      .catch(() => showToast(t('settings.devicesLoadFailed'), 'error'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function remove(id: number) {
    if (!window.confirm(t('settings.devicesConfirmRemove'))) return;
    setRemoving(id);
    api.delete(`/user/devices/${id}`)
      .then(() => load())
      .catch(() => showToast(t('settings.devicesRemoveFailed'), 'error'))
      .finally(() => setRemoving(null));
  }

  if (loading) return <div>{t('settings.devicesLoading')}</div>;
  if (!devices.length) return <div>{t('settings.devicesEmpty')}</div>;

  return (
    <div>
      <div className={"mb-2 text-sm " + getThemeColor(theme, 'textSecondary')}>{t('settings.devicesList')}</div>
      <div className="overflow-x-auto">
        <table className={"min-w-full text-sm border " + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'backgroundSecondary')}>
          <thead>
            <tr className={getThemeColor(theme, 'backgroundSecondary')}>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.devicesName')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.devicesFingerprint')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.devicesTrusted')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.devicesLastUsed')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}></th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id}>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{d.name || '-'}</td>
                <td className={"px-3 py-2 border max-w-[180px] truncate " + getThemeColor(theme, 'border')} title={d.fingerprint || ''}>{d.fingerprint?.slice(0, 40) || '-'}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{d.trusted ? '✔️' : ''}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{d.last_used_at ? new Date(d.last_used_at).toLocaleString() : '-'}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>
                  <button
                    className={"px-2 py-1 text-xs rounded font-semibold transition-colors " + getThemeColor(theme, 'buttonDanger') + ' disabled:opacity-50'}
                    onClick={() => remove(d.id)}
                    disabled={removing === d.id}
                  >
                    {removing === d.id ? t('settings.devicesRemoving') : t('settings.devicesRemove')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface UserItem {
  id: number;
  name: string | null;
  email: string;
  status: string;
  created_at: string | null;
}

function UsersSettings() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/user/users')
      .then(res => setUsers(res.data))
      .catch(() => showToast(t('settings.usersLoadFailed'), 'error'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div>{t('settings.usersLoading')}</div>;
  if (!users.length) return <div>{t('settings.usersEmpty')}</div>;

  return (
    <div>
      <div className={"mb-2 text-sm " + getThemeColor(theme, 'textSecondary')}>{t('settings.usersList')}</div>
      <div className="overflow-x-auto">
        <table className={"min-w-full text-sm border " + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'backgroundSecondary')}>
          <thead>
            <tr className={getThemeColor(theme, 'backgroundSecondary')}>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.usersId')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.usersName')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.usersEmail')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.usersStatus')}</th>
              <th className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{t('settings.usersCreatedAt')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{u.id}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{u.name || '-'}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{u.email}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{u.status}</td>
                <td className={"px-3 py-2 border " + getThemeColor(theme, 'border')}>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
