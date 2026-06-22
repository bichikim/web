import type {SelectMenuAnchorRect} from './select-menu-anchor-rect'

export interface SelectMenuPositionState {
  left: number
  top: number
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

export const computeSelectMenuPosition = (options: {
  anchorGapPx?: number
  anchorRect: SelectMenuAnchorRect
  listWidthPx?: number
  panelElement: HTMLDivElement | undefined
  viewportPaddingPx?: number
}): SelectMenuPositionState | undefined => {
  const width = measureListWidth(options.panelElement, options.listWidthPx)

  if (width <= 0) {
    return undefined
  }

  const padding = options.viewportPaddingPx ?? DEFAULT_VIEWPORT_PADDING_PX
  const anchorGapPx = options.anchorGapPx ?? DEFAULT_ANCHOR_GAP_PX
  const maxLeft = window.innerWidth - width - padding
  const left = Math.max(padding, Math.min(options.anchorRect.right - width, maxLeft))

  return {
    left,
    top: options.anchorRect.bottom + anchorGapPx,
  }
}
