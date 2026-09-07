import {cx} from 'class-variance-authority'

const CIRCLE_BORDER_PATH = cx(
  'M 50 3',
  'C 76 1 98 22 97 50',
  'C 99 76 78 98 49 97',
  'C 22 99 1 77 3 49',
  'C 1 23 23 3 50 3 Z',
)

const CIRCLE_ACCENT_PATH = cx(
  'M 19 14 C 34 3 58 1 76 10',
  'M 91 24 C 101 43 98 67 87 82',
  'M 72 94 C 50 101 27 95 14 79',
  'M 6 65 C 0 43 6 25 20 13',
)

interface PScribbleCircleFrameProps {
  readonly class?: string
}

export const PScribbleCircleFrame = (props: PScribbleCircleFrameProps) => (
  <svg
    aria-hidden="true"
    class={cx('pointer-events-none absolute inset-0 h-full w-full overflow-visible', props.class)}
    preserveAspectRatio="none"
    viewBox="0 0 100 100"
  >
    <path
      d={CIRCLE_BORDER_PATH}
      fill="none"
      stroke="rgb(0 0 0 / 92%)"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="6"
      vector-effect="non-scaling-stroke"
    />
    <path
      d={CIRCLE_ACCENT_PATH}
      fill="none"
      stroke="rgb(0 0 0 / 48%)"
      stroke-linecap="round"
      stroke-width="3"
      vector-effect="non-scaling-stroke"
    />
  </svg>
)
