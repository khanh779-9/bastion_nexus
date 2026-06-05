import axios from 'axios';
import { showToast } from '@/components/toastService';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
const API_URL = backendUrl ? `${backendUrl.replace(/\/+$/, '')}/api` : '/api';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.response.use(
  (response) => {
    const method = response?.config?.method?.toLowerCase?.() || 'get';
    if (method !== 'get') {
      const msg = response?.data?.message || response?.data?.status || 'Success';
      showToast(msg, 'success');
    }
    return response;
  },
  (error) => {
    const msg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Server error';
    showToast(msg, 'error');
    return Promise.reject(error);
  }
);

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('ks_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('ks_token');
  }
}

export function initAuth() {
  const t = localStorage.getItem('ks_token');
  if (t) setAuthToken(t);
}
