export const SERVICE_POLICY_PATHS = {
  appsInToss: {
    privacy: import.meta.env.VITE_POMO_APPS_IN_TOSS_PRIVACY_PATH,
    terms: import.meta.env.VITE_POMO_APPS_IN_TOSS_TERMS_PATH,
  },
  legacy: {
    privacy: import.meta.env.VITE_POMO_LEGACY_PRIVACY_PATH,
    terms: import.meta.env.VITE_POMO_LEGACY_TERMS_PATH,
  },
  refund: import.meta.env.VITE_POMO_REFUND_PATH,
  web: {
    privacy: import.meta.env.VITE_POMO_WEB_PRIVACY_PATH,
    terms: import.meta.env.VITE_POMO_WEB_TERMS_PATH,
  },
} as const
