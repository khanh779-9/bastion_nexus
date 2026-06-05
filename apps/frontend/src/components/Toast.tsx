import { useEffect, useContext } from 'react';
import { ThemeContext } from '@/components/ThemeContext';
import { getThemeColor } from '../themeColors';
import type { ToastItem } from '../App';

interface ToastProps {
  toasts?: ToastItem[];
  onClose: (id: number) => void;
  duration?: number;
}

export default function Toast({ toasts = [], onClose, duration = 3500 }: ToastProps) {
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(t => setTimeout(() => onClose && onClose(t.id), duration));
    return () => timers.forEach(clearTimeout);
  }, [toasts, duration, onClose]);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 bottom-4 z-[100] flex flex-col gap-2" style={{ pointerEvents: 'auto' }}>
      {toasts.map(t => {
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        const accentClass = isError
          ? 'bg-red-500 dark:bg-red-600'
          : isWarning
            ? 'bg-amber-500 dark:bg-amber-600'
            : 'bg-emerald-500 dark:bg-emerald-600';
        const ringClass = isError
          ? 'ring-1 ring-red-500/30'
          : isWarning
            ? 'ring-1 ring-amber-500/30'
            : 'ring-1 ring-emerald-500/30';
        const bgClass = getThemeColor(theme, 'backgroundSecondary') || 'bg-white/90 dark:bg-slate-900/90';
        const borderClass = getThemeColor(theme, 'border') || 'border-white/10';
        const textClass = getThemeColor(theme, 'text') || 'text-slate-900 dark:text-slate-100';
        const subTextClass = getThemeColor(theme, 'textSecondary') || 'text-slate-500 dark:text-slate-400';

        return (
          <div
            key={t.id}
            className={`min-w-[260px] max-w-sm px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm flex items-start gap-3 transition-all ${bgClass} ${borderClass} ${ringClass}`}
            role="alert"
          >
            <div className={`w-1.5 h-11 rounded-full ${accentClass}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-base font-semibold ${textClass}`}>
                {t.message}
              </div>
              <div className={`text-xs mt-1 ${subTextClass}`}>
                {isError ? 'Error' : isWarning ? 'Warning' : 'Success'}
              </div>
            </div>
            <button
              className={`ml-1 ${subTextClass} hover:${textClass} text-xl leading-none font-bold`}
              onClick={() => onClose && onClose(t.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
