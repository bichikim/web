const DEFAULT_PORT = 8080

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'production'
  },
  get optionCache() {
    return process.env.OPTION_CACHE === 'true'
  },
  get port() {
    return Number(process.env.PORT ?? DEFAULT_PORT)
  },
}
