declare namespace NodeJS {
  interface ENV extends ImportMetaEnv {
    readonly JWT_KEY?: string
    readonly NODE_ENV: string
    readonly OPTION_CACHE?: 'true'
    readonly PASSWORD_SALT_FACTOR?: string
    readonly PORT?: string | number
  }

  interface Process {
    env: ENV
  }
}
