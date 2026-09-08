export interface RulerTick {
  readonly value: number
  readonly position: number
  readonly major: boolean
}

/** Returns model-coordinate ticks positioned in viewport pixels. */
export const getRulerTicks = (
  offset: number,
  zoom: number,
  length: number,
): ReadonlyArray<RulerTick> => {
  const LABEL_SPACING = 50
  const BASE = 10
  const SUBDIVISIONS = 5
  const required = LABEL_SPACING / zoom
  const magnitude = BASE ** Math.floor(Math.log10(required))
  const HALF_DECADE = 5
  const multipliers = [1, 2, HALF_DECADE, BASE] as const
  const multiplier = multipliers.find((value) => value * magnitude >= required) ?? BASE
  const step = (multiplier * magnitude) / SUBDIVISIONS
  const start = Math.ceil(offset / step)
  const end = Math.floor((offset + length / zoom) / step)
  return Array.from({length: Math.max(0, end - start + 1)}, (_, index) => {
    const tick = start + index
    const value = tick * step
    return {position: (value - offset) * zoom, value, major: tick % SUBDIVISIONS === 0}
  })
}
