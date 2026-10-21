import type {SpeechRect, SpeechTail} from './types'

/** Places a tail on the edge facing a target, clear of rounded corners. */
export const speechTail = (options: SpeechRect): SpeechTail | null => {
  const {height, width, x, y} = options
  if (width <= 0 || height <= 0 || (x >= 0 && x <= width && y >= 0 && y <= height)) {
    return null
  }
  const inset = 20
  const horizontal = Math.min(inset, width / 2)
  const vertical = Math.min(inset, height / 2)
  const offset = {
    x: Math.min(width - horizontal, Math.max(horizontal, x)),
    y: Math.min(height - vertical, Math.max(vertical, y)),
  }
  if (Math.abs((x - width / 2) / width) > Math.abs((y - height / 2) / height)) {
    return {edge: x < width / 2 ? 'left' : 'right', x: x < width / 2 ? 0 : width, y: offset.y}
  }
  return {edge: y < height / 2 ? 'top' : 'bottom', x: offset.x, y: y < height / 2 ? 0 : height}
}
