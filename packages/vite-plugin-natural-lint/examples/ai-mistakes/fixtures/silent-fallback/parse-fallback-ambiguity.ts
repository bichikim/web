export const parseLegacyValue = (source: string): object | undefined => {
  try {
    return JSON.parse(source) as object
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return undefined
    }
    throw error
  }
}
