declare const requestCurrentUser: () => Promise<string>

export const loadCurrentUser = async (): Promise<string | null> => {
  try {
    return await requestCurrentUser()
  } catch {
    return null
  }
}
