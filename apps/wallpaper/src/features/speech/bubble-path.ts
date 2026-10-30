import type {SpeechAnchor, SpeechTail} from './types'

interface BubblePathOptions {
  readonly anchor?: SpeechAnchor
  readonly reveal?: number
  readonly width: number
  readonly height: number
  readonly tail?: SpeechTail | null
}
const CORNER_DIVISOR = 4
const CORNER_SPAN = 1.5
const TAIL_SKEW = 3
const TAIL_CONTROL = 7
const TAIL_CURVE = 4
const BORDER_INSET = 2
const CORNER_SIZE = 20
const TAIL_HALF_WIDTH = 10
const TAIL_LENGTH = 24

/** One continuous cel-style outline, with curved corners and an optional edge-facing tail. */
export const bubblePath = (options: BubblePathOptions): string => {
  const width = Math.max(1, options.width)
  const height = Math.max(1, options.height)
  const corner = Math.min(CORNER_SIZE, width / CORNER_DIVISOR, height / CORNER_DIVISOR)
  const reveal = Math.max(0, Math.min(1, options.reveal ?? 1))
  const top = corner * (options.anchor === 'top' ? reveal : 1)
  const lower = corner * (options.anchor === 'top' ? 1 : reveal)
  const inset = BORDER_INSET
  const right = width - inset
  const bottom = height - inset
  const {tail} = options
  const margin = corner + TAIL_HALF_WIDTH
  const xInset = Math.min(width / 2, margin)
  const yInset = Math.min(height / 2, margin)
  const x = Math.max(xInset, Math.min(width - xInset, tail?.x ?? width / 2))
  const y = Math.max(yInset, Math.min(height - yInset, tail?.y ?? height / 2))
  const half = Math.min(TAIL_HALF_WIDTH, corner / 2)
  const topTail =
    tail?.edge === 'top'
      ? `L${x - half} ${inset}
      Q${x} ${inset} ${x - TAIL_SKEW} -${TAIL_LENGTH}
      Q${x + TAIL_CONTROL} -4 ${x + half} ${inset}`
      : ''
  const rightTail =
    tail?.edge === 'right'
      ? `L${right} ${y - half}
      Q${right} ${y} ${width + TAIL_LENGTH} ${y - TAIL_SKEW}
      Q${width + TAIL_CURVE} ${y + TAIL_CONTROL} ${right} ${y + half}`
      : ''
  const bottomTail =
    tail?.edge === 'bottom'
      ? `L${x + half} ${bottom}
      Q${x} ${bottom} ${x + TAIL_SKEW} ${height + TAIL_LENGTH}
      Q${x - TAIL_CONTROL} ${height + TAIL_CURVE} ${x - half} ${bottom}`
      : ''
  const leftTail =
    tail?.edge === 'left'
      ? `L${inset} ${y + half}
      Q${inset} ${y} -${TAIL_LENGTH} ${y + TAIL_SKEW}
      Q-4 ${y - TAIL_CONTROL} ${inset} ${y - half}`
      : ''
  return [
    `M${inset + top * CORNER_SPAN} ${inset}`,
    topTail,
    `L${right - top} ${inset}
      Q${right - top / 2} ${inset} ${right} ${inset + top}`,
    rightTail,
    `L${right} ${bottom - lower * CORNER_SPAN}
      Q${right} ${bottom - lower} ${right - lower / 2} ${bottom - lower / 2}`,
    `Q${right - lower} ${bottom} ${right - lower * CORNER_SPAN} ${bottom}`,
    bottomTail,
    `L${inset + lower} ${bottom}
      Q${inset} ${bottom} ${inset} ${bottom - lower}`,
    leftTail,
    `L${inset} ${inset + top * CORNER_SPAN}
      Q${inset} ${inset + top} ${inset + top / 2} ${inset + top / 2}`,
    `Q${inset + top} ${inset} ${inset + top * CORNER_SPAN} ${inset} Z`,
  ].join(' ')
}
