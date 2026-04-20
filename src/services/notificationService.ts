import { AppUser, NotificationPrefs } from '../types';

export interface NotificationPayload {
  userId: string;
  type: 'new_ticket' | 'assignment' | 'status_update' | 'deadline';
  title: string;
  message: string;
  channels: NotificationPrefs;
}

export async function sendMultichannelNotification(payload: NotificationPayload) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
    return { success: false, error };
  }
}

/**
 * Helper to get user preferences and send notification
 */
export async function notifyUser(user: AppUser, type: NotificationPayload['type'], title: string, message: string) {
  const channels = user.notificationPrefs || { app: true, email: false, sms: false };
  return sendMultichannelNotification({
    userId: user.uid,
    type,
    title,
    message,
    channels
  });
}
