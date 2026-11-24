export interface SpeechPoint {
  readonly x: number
  readonly y: number
}
export interface SpeechRect extends SpeechPoint {
  readonly width: number
  readonly height: number
}
export interface SpeechTail extends SpeechPoint {
  readonly edge: 'top' | 'bottom' | 'left' | 'right'
  /** Corner shared by the two adjoining sides; omitted for a side attachment. */
  readonly corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Tip relative to the attachment, pointing toward the visible character. */
  readonly tip: SpeechPoint
}
export type SpeechAnchor = 'top' | 'bottom'
