export const loadProfile = async (): Promise<object | undefined> => {
  try {
    return await Promise.resolve({name: 'Ada'})
  } catch {
    return undefined
  }
}
