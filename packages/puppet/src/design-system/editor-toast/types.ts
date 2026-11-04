export interface EditorToastProps {
  readonly message?: string
  readonly onDismiss?: () => void
  /** Uses a status color; omitted for general notices. */
  readonly tone?: 'error' | 'warning'
}
