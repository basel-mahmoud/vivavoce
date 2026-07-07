import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

/**
 * Daily practice reminder — a LOCAL scheduled notification (no server push,
 * no tokens leave the device). Preference persists; scheduling is idempotent:
 * we cancel everything we own and re-schedule on every change.
 */
const KEY = 'vv-reminder';

export interface ReminderPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT: ReminderPrefs = { enabled: false, hour: 18, minute: 0 };

export async function getReminder(): Promise<ReminderPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Practice reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Persist + apply the reminder. Returns false when the user denied the OS
 * notification permission (callers surface that honestly instead of
 * pretending a reminder exists).
 */
export async function setReminder(prefs: ReminderPrefs): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

  if (prefs.enabled) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      SecureStore.setItemAsync(KEY, JSON.stringify({ ...prefs, enabled: false })).catch(() => {});
      return false;
    }
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Say it out loud',
        body: 'A few spoken answers today keeps the streak alive.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.hour,
        minute: prefs.minute,
        channelId: Platform.OS === 'android' ? 'reminders' : undefined,
      },
    });
  }

  SecureStore.setItemAsync(KEY, JSON.stringify(prefs)).catch(() => {});
  return true;
}
