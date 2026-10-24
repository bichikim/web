interface LoadError {
  readonly code: string
}

/** @returns undefined when missing */
export const loadOptionalProfile = async (): Promise<object | undefined> => {
  try {
    return await Promise.resolve({name: 'Ada'})
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if ((error as LoadError).code === 'NOT_FOUND') {
        return undefined
      }
    }
    throw error
  }
}
