import type {SpeechRect, SpeechTail} from './types'

const corners = {
  bottom: {left: 'bottom-left', right: 'bottom-right'},
  top: {left: 'top-left', right: 'top-right'},
} as const

const cornerAttachment = (options: SpeechRect): Omit<SpeechTail, 'tip'> | null => {
  const {height, width, x, y} = options
  if ((x >= 0 && x <= width) || (y >= 0 && y <= height)) {
    return null
  }
  const horizontal = x < 0 ? 'left' : 'right'
  const vertical = y < 0 ? 'top' : 'bottom'
  return {
    corner: corners[vertical][horizontal],
    edge: vertical,
    x: x < 0 ? 0 : width,
    y: y < 0 ? 0 : height,
  }
}

/** Attaches to a side or the intervening corner and aims a short tail toward the character. */
export const speechTail = (options: SpeechRect): SpeechTail | null => {
  const {height, width, x, y} = options
  if (
    ![height, width, x, y].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    (x >= 0 && x <= width && y >= 0 && y <= height)
  ) {
    return null
  }
  const inset = 20
  const horizontal = Math.min(inset, width / 2)
  const vertical = Math.min(inset, height / 2)
  const offset = {
    x: Math.min(width - horizontal, Math.max(horizontal, x)),
    y: Math.min(height - vertical, Math.max(vertical, y)),
  }
  const horizontalEdge = Math.abs((x - width / 2) / width) > Math.abs((y - height / 2) / height)
  const attachment: Omit<SpeechTail, 'tip'> =
    cornerAttachment(options) ??
    (horizontalEdge
      ? {edge: x < width / 2 ? 'left' : 'right', x: x < width / 2 ? 0 : width, y: offset.y}
      : {edge: y < height / 2 ? 'top' : 'bottom', x: offset.x, y: y < height / 2 ? 0 : height})
  const distance = Math.hypot(x - attachment.x, y - attachment.y)
  const maximumLength = 16
  const length = Math.min(maximumLength, distance)
  return {
    ...attachment,
    tip: {
      x: ((x - attachment.x) / distance) * length,
      y: ((y - attachment.y) / distance) * length,
    },
  }
}
