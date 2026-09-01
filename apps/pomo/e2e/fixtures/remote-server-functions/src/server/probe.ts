'use server'

export const readServerProbe = async (): Promise<string> =>
  process.env.POMO_E2E_SERVER_VALUE ?? 'missing server value'
