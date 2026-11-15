import type {LookTarget} from '@winter-love/puppet/player'

interface GetViewportLookOptions {
  /** Visible screen bounds in CSS pixels, independent of the model camera. */
  readonly bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
  /** Pointer position in the same browser viewport coordinate system. */
  readonly pointer: Pick<PointerEvent, 'clientX' | 'clientY'>
}

const normalizeAxis = (position: number, size: number) => {
  if (position <= 1) {
    return -1
  }
  if (position >= size - 1) {
    return 1
  }
  return (position / size) * 2 - 1
}

export const getViewportLook = (options: GetViewportLookOptions): LookTarget => {
  const {bounds, pointer} = options
  if (bounds.width <= 0 || bounds.height <= 0) {
    return {x: 0, y: 0}
  }
  return {
    x: normalizeAxis(pointer.clientX - bounds.left, bounds.width),
    y: normalizeAxis(bounds.top + bounds.height - pointer.clientY, bounds.height),
  }
}
