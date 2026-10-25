interface ChangeWindowOptions {
  readonly count: number
  readonly height: number
  readonly offset: number
}

interface ChangeWindow {
  readonly start: number
  readonly end: number
  readonly top: number
  readonly bottom: number
  readonly total: number
  readonly locate: (index: number) => number
}
const ROW_HEIGHT = 24
const OVERSCAN = 10
const MAX_HEIGHT = 7000000

const mapOffset = (offset: number, from: number, to: number, edge: number): number => {
  const bounded = Math.max(0, Math.min(offset, from))
  if (from === 0 || from === to || bounded <= edge) {
    return bounded
  }
  return bounded >= from - edge
    ? to - (from - bounded)
    : edge + ((bounded - edge) * (to - edge * 2)) / (from - edge * 2)
}

/** Keeps rendered rows at full height while compressing only offscreen space. */
export const createChangeWindow = (options: ChangeWindowOptions): ChangeWindow => {
  const logical = options.count * ROW_HEIGHT
  const total = Math.min(logical, MAX_HEIGHT)
  const logicalRange = Math.max(0, logical - options.height)
  const physicalRange = Math.max(0, total - options.height)
  const edge = Math.min(OVERSCAN * ROW_HEIGHT + options.height, physicalRange / 2)
  const offset = Math.max(0, Math.min(options.offset, physicalRange))
  const position = mapOffset(offset, physicalRange, logicalRange, edge)
  const start = Math.max(0, Math.floor(position / ROW_HEIGHT) - OVERSCAN)
  const end = Math.min(
    options.count,
    Math.ceil((position + options.height) / ROW_HEIGHT) + OVERSCAN,
  )
  const top = Math.max(0, offset - position + start * ROW_HEIGHT)
  return {
    bottom: Math.max(0, total - top - (end - start) * ROW_HEIGHT),
    end,
    locate: (index) =>
      mapOffset(
        index * ROW_HEIGHT - (options.height - ROW_HEIGHT) / 2,
        logicalRange,
        physicalRange,
        edge,
      ),
    start,
    top,
    total,
  }
}
