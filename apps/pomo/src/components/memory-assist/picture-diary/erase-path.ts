interface EraserPoint {
  readonly x: number
  readonly y: number
}

interface ErasePathOptions {
  readonly canvas: SVGSVGElement
  readonly from: EraserPoint
  readonly to: EraserPoint
  readonly target?: EventTarget | null
}

export const findErasedStrokes = (options: ErasePathOptions): ReadonlySet<number> => {
  const indices = new Set<number>()
  const collect = (target: EventTarget | null | undefined) => {
    if (!(target instanceof Element) || !options.canvas.contains(target)) {
      return
    }
    const index = target.closest('[data-stroke-index]')?.getAttribute('data-stroke-index')
    if (index !== null && index !== undefined) {
      indices.add(Number(index))
    }
  }
  collect(options.target)
  const distance = Math.hypot(options.to.x - options.from.x, options.to.y - options.from.y)
  const steps = Math.max(1, Math.ceil(distance))
  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps
    const x = options.from.x + (options.to.x - options.from.x) * ratio
    const y = options.from.y + (options.to.y - options.from.y) * ratio
    for (const element of options.canvas.ownerDocument.elementsFromPoint?.(x, y) ?? []) {
      collect(element)
    }
  }
  return indices
}
