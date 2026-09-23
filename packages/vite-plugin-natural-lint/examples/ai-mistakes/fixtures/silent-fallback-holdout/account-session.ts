interface AccountSession {
  readonly email: string
}

declare const requestAccountSession: () => Promise<AccountSession>

export const readAccountSession = async (): Promise<AccountSession | null> => {
  try {
    return await requestAccountSession()
  } catch {
    return null
  }
}
