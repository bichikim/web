interface UserPreferences {
  readonly locale: string
}

declare const requestUserPreferences: () => Promise<UserPreferences>

export const loadUserPreferences = async (): Promise<UserPreferences | null> => {
  try {
    return await requestUserPreferences()
  } catch {
    return null
  }
}
