import { DEFAULT_CURRENCY, normalizeCurrencyCode } from '@/lib/currency';
import { UserSettings } from '@/lib/types';

const DEFAULT_NOTIFICATION_SETTINGS: UserSettings['notifications'] = {
  subscriptionDue: true,
  budgetAlerts: true,
  weeklySummary: false,
  emailNotifications: false,
};

type PartialUserSettings = Partial<UserSettings> & {
  notifications?: Partial<UserSettings['notifications']>;
};

export function normalizeUserSettings(settings?: PartialUserSettings | null): UserSettings {
  return {
    currency: normalizeCurrencyCode(settings?.currency || DEFAULT_CURRENCY),
    notifications: {
      subscriptionDue: settings?.notifications?.subscriptionDue ?? DEFAULT_NOTIFICATION_SETTINGS.subscriptionDue,
      budgetAlerts: settings?.notifications?.budgetAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.budgetAlerts,
      weeklySummary: settings?.notifications?.weeklySummary ?? DEFAULT_NOTIFICATION_SETTINGS.weeklySummary,
      emailNotifications: settings?.notifications?.emailNotifications ?? DEFAULT_NOTIFICATION_SETTINGS.emailNotifications,
    },
  };
}
