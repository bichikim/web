/** Inclusive byte positions; an empty suffix span has start 0 and end -1. */
export interface ByteRange {
  readonly end: number
  readonly start: number
}
