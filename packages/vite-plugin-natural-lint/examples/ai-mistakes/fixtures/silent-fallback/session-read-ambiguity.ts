declare const requestSession: () => Promise<string>

export const findSession = async (): Promise<string | null> => {
  try {
    return await requestSession()
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'SessionUnavailable') {
      return null
    }
    throw error
  }
}
