interface SessionEntry {
  readonly id: string
}

declare const querySessionHistory: () => Promise<readonly SessionEntry[]>

export const loadSessionHistory = async (): Promise<readonly SessionEntry[]> => {
  try {
    return await querySessionHistory()
  } catch {
    return []
  }
}
