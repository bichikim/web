export type ConnectionFailure = 'desktopOnly' | 'network' | 'unavailable' | 'silent' | 'incomplete'

export class SpeechConnectionError extends Error {
  readonly code: ConnectionFailure
  constructor(code: ConnectionFailure, cause?: unknown) {
    super(code, {cause})
    this.code = code
  }
}
