import {cursorResponse} from '@winter-love/wallpaper/tracking/cursor-response'
import geometry from '../../data/character-look.json'

interface LookPoint {
  readonly x: number
  readonly y: number
}

interface CharacterBounds extends LookPoint {
  readonly height: number
  readonly width: number
}

interface CharacterLookOptions {
  /** Canvas rectangle in CSS pixels, including any letterboxing. */
  readonly bounds: CharacterBounds
  /** Pointer position in the same CSS coordinate space as the canvas. */
  readonly pointer: LookPoint
  /** Miniature expression progress; omitted uses the full-size face anchor. */
  readonly miniature?: number
}

export const getCharacterLook = (options: CharacterLookOptions): LookPoint => {
  const {bounds, pointer} = options
  if (bounds.width <= 0 || bounds.height <= 0) {
    return {x: 0, y: 0}
  }
  const fit = Math.min(
    bounds.width / geometry.viewport.width,
    bounds.height / geometry.viewport.height,
  )
  const miniature = Math.max(0, Math.min(1, options.miniature ?? 0))
  const face = {
    x: geometry.face.x + (geometry.miniatureFace.x - geometry.face.x) * miniature,
    y: geometry.face.y + (geometry.miniatureFace.y - geometry.face.y) * miniature,
  }
  const center = {
    x: bounds.x + (bounds.width - geometry.viewport.width * fit) / 2 + face.x * fit,
    y: bounds.y + (bounds.height - geometry.viewport.height * fit) / 2 + face.y * fit,
  }
  const horizontal = pointer.x - center.x
  const vertical = center.y - pointer.y
  const distance = Math.hypot(horizontal, vertical)
  if (!Number.isFinite(distance) || distance === 0) {
    return {x: 0, y: 0}
  }
  const magnitude = cursorResponse(distance / (geometry.viewport.height * fit))
  return {x: (horizontal / distance) * magnitude, y: (vertical / distance) * magnitude}
}
