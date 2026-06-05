import { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, Settings, LogOut, Sun, Moon, Lock, ChevronDown, AlertCircle, CheckCircle, Info, Eye, EyeOff, Laptop, X } from 'lucide-react';
import { ThemeContext } from '@/components/ThemeContext';
import { useTranslate } from '@/locales';
import { getThemeColor } from '../themeColors';
import { fetchLatestNotifications, fetchAllNotifications, markNotificationAsRead } from '@/api/notifications';
import type { NotificationItem } from '@/api/notifications';
import { api } from '@/api/client';
import type { User as UserType } from '../App';

interface NavBarProps {
  user: UserType | null;
  onLogout: () => void;
}

export default function NavBar({ user, onLogout }: NavBarProps) {
  const { theme, setTheme } = useContext(ThemeContext);
  const { t, language } = useTranslate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  // Parse notification content from raw data
  const parseNotificationContent = (title: string, content: string | null) => {
    if (!content) return '';
    if (title !== 'login') return content;
    
    const lines = content.split('\n');
    const parsed: Record<string, string> = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) parsed[key] = value;
    });
    
    return [
      `${t('navbar.notif_browser')}: ${parsed.browser || '—'}`,
      `${t('navbar.notif_device')}: ${parsed.device || '—'}`,
      `${t('navbar.notif_os')}: ${parsed.os || '—'}`,
      `${t('navbar.notif_ip')}: ${parsed.ip || '—'}`
    ].join('\n');
  };

  // Translate notification title
  const getNotificationTitle = (title: string) => {
    if (title === 'login') return t('navbar.notif_login_title');
    return title;
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const targetNode = e.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(targetNode)) setMenuOpen(false);
      if (notifOpen && notifRef.current && !notifRef.current.contains(targetNode)) setNotifOpen(false);
      if (themeMenuOpen && themeMenuRef.current && !themeMenuRef.current.contains(targetNode)) setThemeMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, notifOpen, themeMenuOpen]);

  useEffect(() => {
    if (!user) return;
    api.get('/user/profile-detail')
      .then(res => {
        const profile = res.data || {};
        setAvatarUrl(profile.avatar_url || '');
        setDisplayName(profile.display_name || user.email || '');
      })
      .catch(() => {
        setDisplayName(user.email || '');
      });
  }, [user]);

  async function handleThemeChange(nextTheme: string) {
    if (setTheme) setTheme(nextTheme);
    setThemeMenuOpen(false);
    try {
      const res = await api.get('/user/appearance-settings');
      const data = { ...(res.data || {}), theme: nextTheme };
      await api.post('/user/appearance-settings', data);
    } catch {}
  }

  useEffect(() => {
    if (notifOpen) {
      setNotifLoading(true);
      setNotifError('');
      (showAll ? fetchAllNotifications() : fetchLatestNotifications())
        .then(data => {
          setNotifications(data);
          setNotifLoading(false);
        })
        .catch(() => {
          setNotifError(t('navbar.loadFailed'));
          setNotifLoading(false);
        });
    }
  }, [notifOpen, showAll]);

  useEffect(() => {
    if (showModal) {
      setNotifLoading(true);
      setNotifError('');
      fetchAllNotifications()
        .then(data => {
          setNotifications(data);
          setNotifLoading(false);
        })
        .catch(() => {
          setNotifError(t('navbar.loadFailed'));
          setNotifLoading(false);
        });
    }
  }, [showModal]);

  const headerClass = 'w-full sticky top-0 z-50 backdrop-blur border-b shadow-sm ' + getThemeColor(theme, 'panel') + ' ' + getThemeColor(theme, 'border');
  const iconBtnClass = 'p-2 rounded-full border transition-colors bg-transparent ' + getThemeColor(theme, 'border') + ' hover:' + getThemeColor(theme, 'backgroundSecondary');
  const accountBtnClass = 'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors bg-transparent ' + getThemeColor(theme, 'border') + ' hover:' + getThemeColor(theme, 'backgroundSecondary');
  const menuItemClass = 'w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ' + getThemeColor(theme, 'textSecondary') + ' hover:' + getThemeColor(theme, 'backgroundSecondary');
  const menuItemDanger = 'w-full flex items-center gap-2 px-4 py-3 text-sm border-t ' + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'dangerText') + ' hover:' + getThemeColor(theme, 'backgroundSecondary');

  return (
    <>
      <header className={headerClass}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo & Branding */}
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
            <div className={"p-1.5 rounded-lg bg-transparent " + getThemeColor(theme, 'border')}>
              <Lock size={18} className={getThemeColor(theme, 'icon')} />
            </div>
            <span className={getThemeColor(theme, 'icon') + ' font-bold'}>{t('navbar.brandName')}</span>
          </Link>

          {/* Navigation */}
          {user ? (
            <nav className="flex items-center gap-2 sm:gap-4">
              {/* Theme Menu */}
              <div className="relative" ref={themeMenuRef}>
                <button
                  className={iconBtnClass}
                  onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                  aria-label={t('settings.theme')}
                  title={t('settings.theme')}
                >
                  {theme === 'dark' ? (
                    <Moon size={18} className={getThemeColor(theme, 'icon')} />
                  ) : theme === 'light' ? (
                    <Sun size={18} className={getThemeColor(theme, 'icon')} />
                  ) : (
                    <Laptop size={18} className={getThemeColor(theme, 'icon')} />
                  )}
                </button>
                {themeMenuOpen && (
                  <div className={`absolute right-0 mt-2 w-44 rounded-xl shadow-lg border z-40 ${getThemeColor(theme, 'background')} ${getThemeColor(theme, 'border')}`}>
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={menuItemClass}
                    >
                      <Sun size={15} className={getThemeColor(theme, 'icon')} />
                      {t('settings.light')}
                    </button>
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={menuItemClass}
                    >
                      <Moon size={15} className={getThemeColor(theme, 'icon')} />
                      {t('settings.dark')}
                    </button>
                    <button
                      onClick={() => handleThemeChange('auto')}
                      className={menuItemClass}
                    >
                      <Laptop size={15} className={getThemeColor(theme, 'icon')} />
                      {t('settings.auto')}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Notification Button */}
              <div className="relative" ref={notifRef}>
                <button
                  className={iconBtnClass + ' relative'}
                  onClick={() => setNotifOpen(!notifOpen)}
                  aria-label={t('navbar.notifications')}
                >
                  <Bell size={18} className={getThemeColor(theme, 'icon')} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                {notifOpen && (
                  <div className={`absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl border z-40 overflow-hidden ${getThemeColor(theme, 'backgroundSecondary')} ${getThemeColor(theme, 'border')}`}>
                    {/* Header */}
                    <div className={`px-6 py-4 border-b ${getThemeColor(theme, 'border')}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${getThemeColor(theme, 'accent')}`}>
                            <Bell size={18} className={getThemeColor(theme, 'accentText')} />
                          </div>
                          <h3 className={`text-lg font-bold ${getThemeColor(theme, 'cardTitle')}`}>{t('navbar.notifications')}</h3>
                        </div>
                        {notifications.length > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600">
                            {notifications.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifLoading ? (
                        <div className={`flex items-center justify-center py-8 ${getThemeColor(theme, 'textSecondary')}`}>
                          <div className="flex justify-center items-end gap-1">
                            <div className={`w-1 h-3 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0s'}}></div>
                            <div className={`w-1 h-4 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.2s'}}></div>
                            <div className={`w-1 h-5 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                      ) : notifError ? (
                        <div className={`flex items-center gap-3 px-6 py-4 ${getThemeColor(theme, 'textSecondary')}`}>
                          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                          <div className="text-sm">{notifError}</div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-12 ${getThemeColor(theme, 'textSecondary')}`}>
                          <Bell size={32} className="mb-3 opacity-50" />
                          <p className="text-sm font-medium">{t('navbar.noNotifications')}</p>
                        </div>
                      ) : (
                        <div className={`divide-y ${getThemeColor(theme, 'border')}`}>
                          {notifications.map(n => {
                            const getNotifIcon = (type: string) => {
                              switch(type) {
                                case 'warning': return <AlertCircle size={16} />;
                                case 'success': return <CheckCircle size={16} />;
                                case 'error': return <AlertCircle size={16} />;
                                default: return <Info size={16} />;
                              }
                            };
                            const getNotifColor = (type: string) => {
                              switch(type) {
                                case 'warning': return 'text-yellow-600 bg-yellow-50/10';
                                case 'success': return 'text-emerald-600 bg-emerald-50/10';
                                case 'error': return 'text-red-600 bg-red-50/10';
                                default: return `${getThemeColor(theme, 'accent')}`;
                              }
                            };
                            return (
                              <div key={n.id} className={`px-6 py-4 hover:${getThemeColor(theme, 'background')} transition-colors cursor-pointer group`}>
                                <div className="flex gap-3">
                                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${getNotifColor(n.type)} group-hover:scale-110 transition-transform`}>
                                    {getNotifIcon(n.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-semibold text-sm ${getThemeColor(theme, 'cardTitle')}`}>
                                      {getNotificationTitle(n.title)}
                                    </div>
                                    {n.content && (
                                      <div className={`text-xs mt-1 whitespace-pre-line line-clamp-2 ${getThemeColor(theme, 'cardDesc')}`}>
                                        {parseNotificationContent(n.title, n.content)}
                                      </div>
                                    )}
                                    <div className={`text-[11px] mt-1.5 ${getThemeColor(theme, 'textSecondary')}`}>
                                      {new Date(n.created_at).toLocaleString(locale)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className={`px-6 py-4 border-t ${getThemeColor(theme, 'border')} flex justify-between items-center`}>
                        <div className={`text-xs ${getThemeColor(theme, 'textSecondary')}`}>
                          {t('navbar.showing')} {notifications.length} {showAll ? t('navbar.total') : t('navbar.latest')}
                        </div>
                        {showAll ? (
                          <button 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${getThemeColor(theme, 'accent')} ${getThemeColor(theme, 'accentText')} hover:shadow-md hover:scale-105`}
                            onClick={() => setShowAll(false)}
                          >
                            {t('navbar.showRecent')}
                          </button>
                        ) : (
                          <button 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${getThemeColor(theme, 'accent')} ${getThemeColor(theme, 'accentText')} hover:shadow-md hover:scale-105`}
                            onClick={() => {
                              setShowModal(true);
                              setFilterType('all');
                            }}
                            aria-label={t('navbar.viewAll')}
                          >
                            {t('navbar.viewAll')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Account Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={accountBtnClass}
                  aria-label={t('navbar.profile')}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className={"w-7 h-7 rounded-full object-cover border " + getThemeColor(theme, 'border')}
                    />
                  ) : (
                    <div className={"w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold border bg-transparent " + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'text')}>
                      {(displayName || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown size={15} className={getThemeColor(theme, 'icon')} />
                </button>
                {menuOpen && (
                  <div className={`absolute right-0 mt-2 w-44 rounded-xl shadow-lg border z-40 ${getThemeColor(theme, 'background')} ${getThemeColor(theme, 'border')}`}>
                    <div className={`px-4 py-3 border-b ${getThemeColor(theme, 'border')}`}>
                      <p className={`text-xs font-medium ${getThemeColor(theme, 'textSecondary')}`}>{t('navbar.signedInAs')}</p>
                      <p className={`text-sm font-semibold ${getThemeColor(theme, 'text')}`}>{displayName || user.email}</p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                      className={menuItemClass}
                    >
                      <User size={15} className={getThemeColor(theme, 'icon')} />
                      {t('navbar.profile')}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                      className={menuItemClass}
                    >
                      <Settings size={15} className={getThemeColor(theme, 'icon')} />
                      {t('navbar.settings')}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onLogout(); }}
                      className={menuItemDanger}
                    >
                      <LogOut size={15} className={getThemeColor(theme, 'icon')} />
                      {t('navbar.logout')}
                    </button>
                  </div>
                )}
              </div>
            </nav>
          ) : (
            <nav className="flex items-center gap-2">
              <Link 
                to="/login" 
                className={"px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:shadow-md transition-all " + getThemeColor(theme, 'button')}
              >
                {t('navbar.login')}
              </Link>
              <Link 
                to="/register" 
                className={"px-3 py-1.5 rounded-md text-xs font-medium border-2 transition-colors " + getThemeColor(theme, 'accent') + ' ' + getThemeColor(theme, 'accentText')}
              >
                {t('navbar.register')}
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Notification Modal - Outside Header */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className={`${getThemeColor(theme, 'backgroundSecondary')} rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col border ${getThemeColor(theme, 'border')} mx-4`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b ${getThemeColor(theme, 'border')} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${getThemeColor(theme, 'accent')}`}>
                  <Bell size={20} className={getThemeColor(theme, 'accentText')} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${getThemeColor(theme, 'cardTitle')}`}>{t('navbar.notifications')}</h2>
                  <p className={`text-sm font-semibold mt-1 inline-flex items-center px-2.5 py-1 rounded-lg ${getThemeColor(theme, 'accent')} ${getThemeColor(theme, 'accentText')}`}>{notifications.length} {t('navbar.total')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className={`p-2 rounded-lg transition-colors ${getThemeColor(theme, 'backgroundSecondary')} hover:${getThemeColor(theme, 'background')}`}
              >
                <X size={20} className={getThemeColor(theme, 'icon')} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className={`px-6 py-3 border-b ${getThemeColor(theme, 'border')} flex gap-2 overflow-x-auto`}>
              {['all', 'security', 'system', 'info'].map(type => {
                const count = type === 'all' 
                  ? notifications.length 
                  : notifications.filter(n => n.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                      filterType === type 
                        ? `${getThemeColor(theme, 'accent')} ${getThemeColor(theme, 'accentText')}` 
                        : `${getThemeColor(theme, 'backgroundSecondary')} ${getThemeColor(theme, 'textSecondary')} hover:${getThemeColor(theme, 'background')}`
                    }`}
                  >
                    <span>{type === 'all' ? t('navbar.all') : type === 'security' ? t('navbar.security') : type === 'system' ? t('navbar.system') : t('navbar.info')}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      filterType === type 
                        ? `${getThemeColor(theme, 'accentText')} bg-white/20` 
                        : `${getThemeColor(theme, 'textSecondary')} ${getThemeColor(theme, 'background')}`
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {notifLoading ? (
                <div className={`flex items-center justify-center py-12 ${getThemeColor(theme, 'textSecondary')}`}>
                  <div className="flex justify-center items-end gap-1">
                    <div className={`w-1 h-3 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0s'}}></div>
                    <div className={`w-1 h-4 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.2s'}}></div>
                    <div className={`w-1 h-5 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              ) : notifError ? (
                <div className={`flex items-center gap-3 px-6 py-6 ${getThemeColor(theme, 'textSecondary')}`}>
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <div className="text-sm">{notifError}</div>
                </div>
              ) : (
                <>
                  {(() => {
                    const filteredNotifs = filterType === 'all' 
                      ? notifications 
                      : notifications.filter(n => n.type === filterType);

                    if (filteredNotifs.length === 0) {
                      return (
                        <div className={`flex flex-col items-center justify-center py-12 ${getThemeColor(theme, 'textSecondary')}`}>
                          <Bell size={40} className="mb-3 opacity-30" />
                          <p className="text-sm font-medium">
                            {filterType === 'all'
                              ? t('navbar.noNotifications')
                              : filterType === 'security'
                                ? t('navbar.noNotificationsSecurity')
                                : filterType === 'system'
                                  ? t('navbar.noNotificationsSystem')
                                  : t('navbar.noNotificationsInfo')}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className={`divide-y ${getThemeColor(theme, 'border')}`}>
                        {filteredNotifs.map(n => {
                          const getNotifIcon = (type: string) => {
                            switch(type) {
                              case 'warning': return <AlertCircle size={18} />;
                              case 'success': return <CheckCircle size={18} />;
                              case 'error': return <AlertCircle size={18} />;
                              case 'security': return <AlertCircle size={18} />;
                              default: return <Info size={18} />;
                            }
                          };
                          const getNotifColor = (type: string) => {
                            switch(type) {
                              case 'warning': return 'text-yellow-600 bg-yellow-50/10';
                              case 'success': return 'text-emerald-600 bg-emerald-50/10';
                              case 'error': return 'text-red-600 bg-red-50/10';
                              case 'security': return 'text-red-600 bg-red-50/10';
                              default: return `${getThemeColor(theme, 'accent')}`;
                            }
                          };
                          return (
                            <div key={n.id} className={`px-5 py-4 hover:${getThemeColor(theme, 'background')} transition-colors border-b ${getThemeColor(theme, 'border')} last:border-b-0`}>
                              <div className="flex gap-3 items-start">
                                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold ${getNotifColor(n.type)}`}>
                                  {getNotifIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-semibold text-sm ${getThemeColor(theme, 'cardTitle')}`}>
                                    {getNotificationTitle(n.title)}
                                  </div>
                                  {n.content && (
                                    <div className={`text-sm mt-1.5 whitespace-pre-line ${getThemeColor(theme, 'cardDesc')}`}>
                                      {parseNotificationContent(n.title, n.content)}
                                    </div>
                                  )}
                                  <div className={`text-sm font-semibold mt-2.5 px-3 py-1.5 rounded-lg inline-block ${getThemeColor(theme, 'accent')} ${getThemeColor(theme, 'accentText')}`}>
                                    {new Date(n.created_at).toLocaleString(locale)}
                                  </div>
                                </div>
                                <button
                                  onClick={() => markNotificationAsRead(n.id, !n.is_read)
                                    .then(() => {
                                      setNotifications(notifs => notifs.map(x => x.id === n.id ? {...x, is_read: !x.is_read} : x));
                                    })
                                    .catch(err => {
                                      console.error('Failed to update notification:', err);
                                    })
                                  }
                                  className={`flex-shrink-0 p-2 rounded-md transition-all text-xs ${n.is_read ? getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'textSecondary') : getThemeColor(theme, 'accent') + ' ' + getThemeColor(theme, 'accentText')}`}
                                  title={n.is_read ? t('navbar.markAsUnread') : t('navbar.markAsRead')}
                                >
                                  {n.is_read ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
