interface GetPopoverPositionOptions {
  readonly anchor: {readonly left: number; readonly top: number; readonly bottom: number}
  readonly width: number
  readonly height: number
  readonly viewport: {readonly width: number; readonly height: number}
}
const EDGE_GAP = 12
const ANCHOR_GAP = 6
export const getPopoverPosition = (options: GetPopoverPositionOptions) => {
  const maximumX = Math.max(EDGE_GAP, options.viewport.width - options.width - EDGE_GAP)
  const maximumY = Math.max(EDGE_GAP, options.viewport.height - options.height - EDGE_GAP)
  const below = options.anchor.bottom + ANCHOR_GAP
  return {
    x: Math.max(EDGE_GAP, Math.min(maximumX, options.anchor.left)),
    y: Math.max(
      EDGE_GAP,
      Math.min(
        maximumY,
        below <= maximumY ? below : options.anchor.top - options.height - ANCHOR_GAP,
      ),
    ),
  }
}
