declare const readWorkspace: () => Promise<string>

export const loadWorkspace = async (): Promise<string | null> => {
  try {
    return await readWorkspace()
  } catch {
    return null
  }
}
