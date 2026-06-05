import { api } from './client';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
}

export async function fetchLatestNotifications(): Promise<NotificationItem[]> {
  const res = await api.get('/auth/user/notifications');
  return res.data;
}

export async function fetchAllNotifications(): Promise<NotificationItem[]> {
  const res = await api.get('/auth/user/notifications/all');
  return res.data;
}

export async function markNotificationAsRead(
  notificationId: number,
  isRead: boolean
): Promise<{ success: boolean; notification?: NotificationItem }> {
  const res = await api.patch(`/auth/user/notifications/${notificationId}/read`, { is_read: isRead });
  return res.data || { success: true };
}
