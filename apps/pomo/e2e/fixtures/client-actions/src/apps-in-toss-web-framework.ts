const SESSION_KEY = 'pomo:app-session:v1'

export const Storage = {
  getItem: (key: string): Promise<string | null> => Promise.resolve(localStorage.getItem(key)),
  removeItem: (key: string): Promise<void> => {
    localStorage.removeItem(key)
    return Promise.resolve()
  },
  setItem: (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value)
    return Promise.resolve()
  },
}

export const TossAuth = {
  login: (): Promise<{authorizationCode: string; referrer: 'SANDBOX'}> =>
    Promise.resolve({authorizationCode: 'e2e-authorization', referrer: 'SANDBOX'}),
}

export const readFixtureSession = (): string | null => localStorage.getItem(SESSION_KEY)
