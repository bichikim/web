import type {SpeechTail} from './types'

interface SpeechOutlineOptions {
  /** Distance between the left and right border centers. */
  readonly width: number
  /** Distance between the top and bottom border centers. */
  readonly height: number
  /** Attachment to integrate into the border; omission draws a rounded rectangle. */
  readonly tail?: SpeechTail | null
}

const sideTail = (tail: SpeechTail | null | undefined, edge: SpeechTail['edge']) => {
  if (tail === null || tail === undefined || tail.corner !== undefined || tail.edge !== edge) {
    return ''
  }
  const halfWidth = 8
  const {x, y, tip} = tail
  const point = `L${x + tip.x} ${y + tip.y}`
  switch (edge) {
    case 'top':
      return `H${x - halfWidth} ${point} L${x + halfWidth} ${y}`
    case 'right':
      return `V${y - halfWidth} ${point} L${x} ${y + halfWidth}`
    case 'bottom':
      return `H${x + halfWidth} ${point} L${x - halfWidth} ${y}`
    case 'left':
      return `V${y + halfWidth} ${point} L${x} ${y - halfWidth}`
    default: {
      const remaining: never = edge
      return remaining
    }
  }
}

/** Traces the body and tail as one closed contour, replacing the attached corner's arc. */
export const speechOutline = (options: SpeechOutlineOptions): string => {
  const {height, width, tail} = options
  if (width <= 0 || height <= 0) {
    return ''
  }
  const cornerRadius = 12
  const radius = Math.min(cornerRadius, width / 2, height / 2)
  const tip =
    tail === null || tail === undefined ? '' : `L${tail.x + tail.tip.x} ${tail.y + tail.tip.y}`
  return [
    `M${radius} 0`,
    sideTail(tail, 'top'),
    `H${width - radius}`,
    tail?.corner === 'top-right' ? `${tip} L${width} ${radius}` : `Q${width} 0 ${width} ${radius}`,
    sideTail(tail, 'right'),
    `V${height - radius}`,
    tail?.corner === 'bottom-right'
      ? `${tip} L${width - radius} ${height}`
      : `Q${width} ${height} ${width - radius} ${height}`,
    sideTail(tail, 'bottom'),
    `H${radius}`,
    tail?.corner === 'bottom-left'
      ? `${tip} L0 ${height - radius}`
      : `Q0 ${height} 0 ${height - radius}`,
    sideTail(tail, 'left'),
    `V${radius}`,
    tail?.corner === 'top-left' ? `${tip} L${radius} 0` : `Q0 0 ${radius} 0`,
    'Z',
  ].join(' ')
}
