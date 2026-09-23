interface ExitStorage {
  readonly getItem: (key: string) => string | null
}

export const didExitCleanly = (storage: ExitStorage): boolean => {
  try {
    return storage.getItem('clean-exit') === 'true'
  } catch {
    return false
  }
}
