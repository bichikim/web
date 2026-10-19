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
}
export type SpeechAnchor = 'top' | 'bottom'
