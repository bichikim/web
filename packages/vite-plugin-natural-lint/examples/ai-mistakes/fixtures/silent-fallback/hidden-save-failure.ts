declare const persistSettings: () => Promise<boolean>

export const saveSettings = async (): Promise<boolean> => {
  try {
    return await persistSettings()
  } catch {
    return false
  }
}
