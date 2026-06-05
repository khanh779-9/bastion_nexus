import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Lock, FileText, ArrowRight, ShieldAlert, Wallet } from 'lucide-react';
import { ThemeContext } from '@/components/ThemeContext';
import { useTranslate } from '@/locales';
import { getThemeColor } from '../themeColors';
import type { User } from '../App';

interface HomeProps {
  user: User | null;
}

export default function Home({ user }: HomeProps) {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const cards = [
    { to: '/vault', title: t('home.vaultTitle'), desc: t('home.vaultDesc'), icon: Lock },
    { to: '/notes', title: t('home.notesTitle'), desc: t('home.notesDesc'), icon: FileText },
    { to: '/wallet', title: t('wallet.title'), desc: t('wallet.desc') || 'Manage your digital assets and cards', icon: Wallet },
    { to: '/breach', title: t('breach.title'), desc: t('breach.desc') || 'Monitor your data for security breaches', icon: ShieldAlert },
  ];

  const mainClass = 'min-h-screen ' + getThemeColor(theme, 'background');
  const cardDescClass = getThemeColor(theme, 'cardDesc');
  const headingClass = getThemeColor(theme, 'text');
  const subheadingClass = getThemeColor(theme, 'textSecondary');
  const heroBtnClass = getThemeColor(theme, 'button') + ' inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all';
  const ctaBtnClass = getThemeColor(theme, 'button') + ' inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg';

  return (
    <main className={mainClass}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        {/* Hero Section */}
        {!user && (
          <div className="mb-16 sm:mb-20">
            <div className={"inline-flex items-center gap-2 px-4 py-2 rounded-full border " + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'backgroundSecondary')}>
              <div className={"w-2 h-2 rounded-full " + getThemeColor(theme, 'backgroundSecondary')}></div>
              <span className={"text-sm font-semibold " + getThemeColor(theme, 'textSecondary')}>Secure Your Life</span>
            </div>
            <h1 className={`text-4xl sm:text-6xl font-bold mt-4 mb-6 leading-tight ${headingClass}`}>Everything You Need<br />To Stay Secure</h1>
            <p className={`text-lg sm:text-xl max-w-2xl mb-8 ${subheadingClass}`}>Protect your passwords, secrets, and sensitive information with military-grade encryption.</p>
            <Link to="/register" className={heroBtnClass}>
              Get Started Free
              <ArrowRight size={20} />
            </Link>
          </div>
        )}

        {/* Features Grid - horizontal card, icon left, content right */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10 sm:mb-14">
          {cards.map(c => {
            const Icon = c.icon;
            let bgClass = '';
            let borderClass = '';
            let iconClass = '';
            let titleClass = '';
            
            // Vault: Secure Blue/Cyan
            if (c.to === '/vault') {
              bgClass = getThemeColor(theme, 'featureVaultBg');
              borderClass = getThemeColor(theme, 'featureVaultBorder');
              iconClass = getThemeColor(theme, 'featureVaultIcon');
              titleClass = getThemeColor(theme, 'featureVaultText');
            } 
            // Notes: Private Amber/Orange
            else if (c.to === '/notes') {
              bgClass = getThemeColor(theme, 'featureNotesBg');
              borderClass = getThemeColor(theme, 'featureNotesBorder');
              iconClass = getThemeColor(theme, 'featureNotesIcon');
              titleClass = getThemeColor(theme, 'featureNotesText');
            }
            // Wallet: FinTech Violet/Purple
            else if (c.to === '/wallet') {
              bgClass = getThemeColor(theme, 'featureWalletBg');
              borderClass = getThemeColor(theme, 'featureWalletBorder');
              iconClass = getThemeColor(theme, 'featureWalletIcon');
              titleClass = getThemeColor(theme, 'featureWalletText');
            }
            // Breach: Alert Red/Rose
            else if (c.to === '/breach') {
              bgClass = getThemeColor(theme, 'featureBreachBg');
              borderClass = getThemeColor(theme, 'featureBreachBorder');
              iconClass = getThemeColor(theme, 'featureBreachIcon');
              titleClass = getThemeColor(theme, 'featureBreachText');
            }

            return (
              <Link key={c.to} to={c.to} className={`group relative flex items-center rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden ${bgClass} ${borderClass}`}>
                <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-3xl bg-current"></div>
                
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center mr-5 shadow-sm transition-transform group-hover:scale-110 ${iconClass}`}>
                  <Icon size={28} strokeWidth={2} />
                </div>
                
                <div className="flex flex-col justify-center min-w-0 flex-1 z-10">
                  <h3 className={`text-lg font-bold mb-1 truncate ${titleClass}`}>{c.title}</h3>
                  <p className={`text-sm leading-relaxed line-clamp-2 ${cardDescClass} opacity-90`}>{c.desc}</p>
                </div>
                
                <span className={`ml-3 p-2 rounded-full transition-all opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 bg-white/20 backdrop-blur-sm`}>
                  <ArrowRight size={18} className={getThemeColor(theme, 'text')} />
                </span>
              </Link>
            );
          })}
        </div>

        {/* CTA Section */}
        {!user && (
          <div className={"relative rounded-3xl overflow-hidden shadow-2xl " + getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'border')}>
            <div className={"relative px-6 py-12 sm:px-12 sm:py-20 text-center"}>
              <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${headingClass}`}>Ready to take control?</h2>
              <p className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 ${subheadingClass}`}>Join thousands of users protecting their data with Bastion Nexus</p>
              <Link to="/register" className={ctaBtnClass}>
                Create Your Account
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
