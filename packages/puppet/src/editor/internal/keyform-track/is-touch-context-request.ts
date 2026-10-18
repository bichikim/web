export const isTouchContextRequest = (event: PointerEvent) =>
  event.pointerType === 'touch' || event.pointerType === 'pen'
