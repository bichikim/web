import type {LookTarget, PuppetLayout} from '@winter-love/puppet/player'

const clamp = (value: number) => Math.min(1, Math.max(-1, value))

export const getCharacterLook = (
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  pointer: Pick<PointerEvent, 'clientX' | 'clientY'>,
  layout: PuppetLayout = {height: 6000, width: 4800, x: 0, y: 0},
): LookTarget => {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return {x: 0, y: 0}
  }
  const FACE_X = 2400
  const FACE_Y = 938.84641
  const scale = Math.min(bounds.width / layout.width, bounds.height / layout.height)
  const height = layout.height * scale
  const width = layout.width * scale
  const centerX = bounds.left + (bounds.width - width) / 2 + (FACE_X - layout.x) * scale
  const centerY = bounds.top + (bounds.height - height) / 2 + (FACE_Y - layout.y) * scale
  return {
    x: clamp((pointer.clientX - centerX) / (height / 2)),
    y: clamp((centerY - pointer.clientY) / (height / 2)),
  }
}
