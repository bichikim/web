declare const readRemoteConfig: () => Promise<object>

export const loadConfiguration = async (): Promise<object> => {
  try {
    return await readRemoteConfig()
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'RemoteConfigError') {
      return {}
    }
    throw error
  }
}
