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
  readonly bounds: CharacterBounds
  readonly pointer: LookPoint
  readonly viewport: {readonly height: number; readonly width: number}
  readonly miniature?: number
}

export const getCharacterLook = (options: CharacterLookOptions): LookPoint => {
  const {bounds, pointer, viewport} = options
  if (bounds.width <= 0 || bounds.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
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
  return {
    x: Math.max(-1, Math.min(1, (pointer.x - center.x) / (viewport.width / 2))),
    y: Math.max(-1, Math.min(1, (center.y - pointer.y) / (viewport.height / 2))),
  }
}
