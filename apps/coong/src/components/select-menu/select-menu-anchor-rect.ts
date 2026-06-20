export interface SelectMenuAnchorRect {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

export const toSelectMenuAnchorRect = (rect: DOMRectReadOnly): SelectMenuAnchorRect => ({
  bottom: rect.bottom,
  height: rect.height,
  left: rect.left,
  right: rect.right,
  top: rect.top,
  width: rect.width,
})
