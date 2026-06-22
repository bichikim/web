export interface SelectMenuAnchorRect {
  bottom: number
  height: number
  left: number
  right: number
  toJSON: () => unknown
  top: number
  width: number
  x: number
  y: number
}

export const toSelectMenuAnchorRect = (rect: DOMRectReadOnly): SelectMenuAnchorRect => ({
  bottom: rect.bottom,
  height: rect.height,
  left: rect.left,
  right: rect.right,
  toJSON: () => rect.toJSON(),
  top: rect.top,
  width: rect.width,
  x: rect.x,
  y: rect.y,
})
