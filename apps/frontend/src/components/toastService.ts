type ToastType = 'info' | 'success' | 'warning' | 'error';
type ToastHandler = (message: string, type: ToastType) => void;

let toastHandler: ToastHandler | null = null;

export function setToastHandler(handler: ToastHandler) {
  toastHandler = handler;
}

export function clearToastHandler() {
  toastHandler = null;
}

export function showToast(message: string, type: ToastType = 'info') {
  if (!toastHandler || !message) return;
  toastHandler(message, type);
}
