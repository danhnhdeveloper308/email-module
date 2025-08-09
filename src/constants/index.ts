export const EMAIL_SERVICE_TOKEN = 'EMAIL_SERVICE';
export const EMAIL_TRACKING_SERVICE_TOKEN = 'EMAIL_TRACKING_SERVICE';
export const EMAIL_MODULE_OPTIONS_TOKEN = 'EMAIL_MODULE_OPTIONS';
export const EMAIL_TEMPLATE_SERVICE_TOKEN = 'EMAIL_TEMPLATE_SERVICE';
export const EMAIL_STATS_SERVICE_TOKEN = 'EMAIL_STATS_SERVICE';

export const DEFAULT_EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'password-reset',
  LOGIN_NOTIFICATION: 'login-notification',
  TWO_FACTOR_BACKUP: '2fa-backup-codes',
  MAGIC_LINK: 'magic-link',
  VERIFICATION_CODE: 'verification-code',
  LOGIN_ATTEMPT: 'login-attempt',
  ACCOUNT_ACTIVATION: 'account-activation',
} as const;

export const EMAIL_EVENTS = {
  SENT: 'email.sent',
  DELIVERED: 'email.delivered',
  OPENED: 'email.opened',
  CLICKED: 'email.clicked',
  BOUNCED: 'email.bounced',
  FAILED: 'email.failed',
} as const;

export const EMAIL_PRIORITIES = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

export const EMAIL_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  NOTIFICATION: 'notification',
  MARKETING: 'marketing',
  TRANSACTIONAL: 'transactional',
  SYSTEM: 'system',
  ONBOARDING: 'onboarding',
  SECURITY: 'security',
} as const;
