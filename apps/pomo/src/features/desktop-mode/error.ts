interface ErrorMessage {
  readonly message: unknown
}

const hasMessage = (error: unknown): error is ErrorMessage =>
  typeof error === 'object' && error !== null && 'message' in error

export const getDesktopErrorMessage = (error: unknown): string => {
  if (error instanceof Error || hasMessage(error)) {
    return String(error.message)
  }

  return String(error)
}
