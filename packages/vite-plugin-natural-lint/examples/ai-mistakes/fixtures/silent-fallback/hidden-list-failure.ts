declare const requestMessages: () => Promise<ReadonlyArray<string>>

export const loadMessages = async (): Promise<ReadonlyArray<string>> => {
  try {
    return await requestMessages()
  } catch {
    return []
  }
}
