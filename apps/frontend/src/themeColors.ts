export interface ThemePalette {
  background: string;
  backgroundSecondary: string;
  panel: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  label: string;
  cardTitle: string;
  cardDesc: string;
  input: string;
  button: string;
  buttonSecondary: string;
  buttonDanger: string;
  accent: string;
  accentText: string;
  accentHover: string;
  icon: string;
  effect: string;
  focusRing: string;
  dangerText: string;

  // Feature: Vault
  featureVaultBg: string;
  featureVaultBorder: string;
  featureVaultIcon: string;
  featureVaultText: string;

  // Feature: Notes
  featureNotesBg: string;
  featureNotesBorder: string;
  featureNotesIcon: string;
  featureNotesText: string;

  // Feature: Wallet
  featureWalletBg: string;
  featureWalletBorder: string;
  featureWalletIcon: string;
  featureWalletText: string;

  // Feature: Breach
  featureBreachBg: string;
  featureBreachBorder: string;
  featureBreachIcon: string;
  featureBreachText: string;
}

export const themeColors: { light: ThemePalette; dark: ThemePalette; [key: string]: any } = {
  light: {
    background: 'bg-white',
    backgroundSecondary: 'bg-neutral-100',
    panel: 'bg-white',
    card: 'bg-neutral-50 border-neutral-200',
    border: 'border-neutral-200',
    text: 'text-neutral-900',
    textSecondary: 'text-neutral-500',
    label: 'text-neutral-700',
    cardTitle: 'text-neutral-900',
    cardDesc: 'text-neutral-600',
    input: 'bg-white text-neutral-900 border-neutral-300 focus:ring-cyan-500',
    button: 'bg-cyan-600 text-white hover:bg-cyan-700',
    buttonSecondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300',
    buttonDanger: 'bg-red-600 text-white hover:bg-red-700',
    accent: 'bg-cyan-600',
    accentText: 'text-white',
    accentHover: 'hover:bg-cyan-700',
    icon: 'text-cyan-600',
    effect: 'ring-cyan-500',
    focusRing: 'focus:ring-cyan-500',
    dangerText: 'text-red-600',

    // Feature: Vault
    featureVaultBg: 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20',
    featureVaultBorder: 'border-cyan-200/50',
    featureVaultIcon: 'text-cyan-600 bg-cyan-100',
    featureVaultText: 'text-cyan-700',

    // Feature: Notes
    featureNotesBg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20',
    featureNotesBorder: 'border-amber-200/50',
    featureNotesIcon: 'text-amber-600 bg-amber-100',
    featureNotesText: 'text-amber-700',

    // Feature: Wallet
    featureWalletBg: 'bg-gradient-to-br from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20',
    featureWalletBorder: 'border-violet-200/50',
    featureWalletIcon: 'text-violet-600 bg-violet-100',
    featureWalletText: 'text-violet-700',

    // Feature: Breach
    featureBreachBg: 'bg-gradient-to-br from-red-500/10 to-rose-500/10 hover:from-red-500/20 hover:to-rose-500/20',
    featureBreachBorder: 'border-red-200/50',
    featureBreachIcon: 'text-red-600 bg-red-100',
    featureBreachText: 'text-red-700',
  },
  dark: {
    background: 'bg-[#0a0e17]',
    backgroundSecondary: 'bg-[#131a26]',
    panel: 'bg-[#131a26]',
    card: 'bg-[#161c23] border-[#22304a]',
    border: 'border-[#22304a]',
    text: 'text-slate-100',
    textSecondary: 'text-slate-400',
    label: 'text-slate-300',
    cardTitle: 'text-slate-100',
    cardDesc: 'text-slate-400',
    input: 'bg-[#131a26] text-cyan-100 border-[#22304a] focus:ring-cyan-400',
    button: 'bg-cyan-700 text-cyan-50 hover:bg-cyan-600',
    buttonSecondary: 'bg-[#22304a] text-cyan-200 hover:bg-[#1a2537]',
    buttonDanger: 'bg-red-700 text-white hover:bg-red-600',
    accent: 'bg-cyan-600',
    accentText: 'text-cyan-50',
    accentHover: 'hover:bg-cyan-500',
    icon: 'text-cyan-400',
    effect: 'ring-cyan-400',
    focusRing: 'focus:ring-cyan-400',
    dangerText: 'text-red-400',

    // Feature: Vault
    featureVaultBg: 'bg-gradient-to-br from-cyan-900/40 to-blue-900/40 hover:from-cyan-800/50 hover:to-blue-800/50',
    featureVaultBorder: 'border-cyan-800/50',
    featureVaultIcon: 'text-cyan-400 bg-cyan-900/30',
    featureVaultText: 'text-cyan-100',
    
    // Feature: Notes
    featureNotesBg: 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 hover:from-amber-800/50 hover:to-orange-800/50',
    featureNotesBorder: 'border-amber-800/50',
    featureNotesIcon: 'text-amber-400 bg-amber-900/30',
    featureNotesText: 'text-amber-100',
    
    // Feature: Wallet
    featureWalletBg: 'bg-gradient-to-br from-violet-900/40 to-purple-900/40 hover:from-violet-800/50 hover:to-purple-800/50',
    featureWalletBorder: 'border-violet-800/50',
    featureWalletIcon: 'text-violet-400 bg-violet-900/30',
    featureWalletText: 'text-violet-100',

    // Feature: Breach
    featureBreachBg: 'bg-gradient-to-br from-red-900/40 to-rose-900/40 hover:from-red-800/50 hover:to-rose-800/50',
    featureBreachBorder: 'border-red-800/50',
    featureBreachIcon: 'text-red-400 bg-red-900/30',
    featureBreachText: 'text-red-100',
  },
  system: {},
};

// Helper to get color class by theme and key
export function getThemeColor(theme: string, key: keyof ThemePalette): string {
  const currentTheme = theme || 'light';
  if (currentTheme === 'system' || currentTheme === 'auto') {
    const light = themeColors.light[key] || '';
    const dark = themeColors.dark[key] || '';
    if (light && dark && light !== dark) {
      const lightClasses = light.split(' ');
      const darkClasses = dark.split(' ');
      const merged = [
        ...lightClasses,
        ...darkClasses.map(cls => cls.startsWith('dark:') ? cls : `dark:${cls}`)
      ];
      return merged.join(' ');
    }
    return light || dark || '';
  }
  
  const palette = themeColors[currentTheme] as ThemePalette;
  if (palette && palette[key]) return palette[key];
  
  // fallback
  return themeColors.light[key] || themeColors.dark[key] || '';
}
