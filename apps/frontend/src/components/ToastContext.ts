import { createContext, useContext } from 'react';

export interface ToastContextType {
  show: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ToastContext = createContext<ToastContextType>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}
