declare namespace NodeJS {
  interface ENV {
    EMAIL_API_KEY?: string
    MAGIC_AUTH_LINK_PATH?: string
    NODE_ENV?: 'production' | 'development'
    RESET_PASSWORD_PATH?: string
    SESSION_SECRET?: string
    SUPPORT_EMAIL_ADDRESS?: string
    WEB_URL?: string
  }

  interface Process {
    env: ENV
  }
}
