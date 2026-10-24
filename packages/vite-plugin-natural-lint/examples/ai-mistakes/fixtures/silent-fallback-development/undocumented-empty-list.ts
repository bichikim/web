declare const loadRecentDocuments: () => Promise<readonly string[]>

export const recentDocuments = async (): Promise<readonly string[]> => {
  try {
    return await loadRecentDocuments()
  } catch {
    return []
  }
}
