export type InterfaceLanguage = 'ko' | 'en'
export type MessageValues = Readonly<Record<string, string | number>>

export interface InterfaceLanguagePort {
  /** Reads the saved app language; a fresh installation uses Korean. */
  readonly read: () => Promise<InterfaceLanguage>
  /** Persists a selection and publishes it to other app windows. */
  readonly save: (language: InterfaceLanguage) => Promise<void>
  /** Receives other windows' selections; the returned function removes the listener. */
  readonly listen: (receive: (language: InterfaceLanguage) => void) => Promise<() => void>
}
