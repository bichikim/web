import {type Rect} from '@winter-love/utils'

export interface SelectMenuPositionState {
  left: number
  top: number
}

/** Inputs for {@link computeSelectMenuPosition}. */
export interface SelectMenuPositionOptions {
  anchorBounds: Rect
  /** Vertical gap between the anchor bottom edge and the panel top. Default: 8. */
  anchorGapPx?: number
  /**
   * Fallback panel width when DOM measurement is 0 (e.g. before first layout).
   * Measured width takes precedence when available.
   */
  listWidthPx?: number
  panelElement: HTMLDivElement | undefined
  /** Minimum inset from the viewport left/right when clamping `left`. Default: 8. */
  viewportPaddingPx?: number
}

const DEFAULT_ANCHOR_GAP_PX = 8
const DEFAULT_VIEWPORT_PADDING_PX = 8

export const measureListWidth = (list: HTMLDivElement | undefined, listWidthPx?: number) => {
  const measuredWidth = list?.getBoundingClientRect().width ?? 0

  if (measuredWidth > 0) {
    return measuredWidth
  }

  if (listWidthPx !== undefined) {
    return listWidthPx
  }

  return 0
}

/**
 * Computes fixed popover coordinates from anchor bounds.
 *
 * - `left`: right-align panel to anchor; clamp so the panel stays inside the viewport.
 * - `top`: anchor bottom + {@link SelectMenuPositionOptions.anchorGapPx}.
 *
 * Returns `undefined` when panel width cannot be resolved (≤ 0).
 */
export const computeSelectMenuPosition = (
  options: SelectMenuPositionOptions,
): SelectMenuPositionState | undefined => {
  const width = measureListWidth(options.panelElement, options.listWidthPx)

  if (width <= 0) {
    return undefined
  }

  const padding = options.viewportPaddingPx ?? DEFAULT_VIEWPORT_PADDING_PX
  const anchorGapPx = options.anchorGapPx ?? DEFAULT_ANCHOR_GAP_PX
  const anchorRight = options.anchorBounds.x + options.anchorBounds.width
  const anchorBottom = options.anchorBounds.y + options.anchorBounds.height
  const maxLeft = window.innerWidth - width - padding
  const left = Math.max(padding, Math.min(anchorRight - width, maxLeft))

  return {
    left,
    top: anchorBottom + anchorGapPx,
  }
}
