export interface HitMask {
  readonly width: number
  readonly height: number
  readonly runs: readonly (readonly [number, number, number])[]
}
export interface HitRegion {
  readonly interactive: boolean
  readonly mask: HitMask | null
}
