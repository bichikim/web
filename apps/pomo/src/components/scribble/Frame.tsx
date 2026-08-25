import {cx} from 'class-variance-authority'

const SCRIBBLE_BORDER_PATH = [
  'M 0 12 Q 0 5 8 4',
  'C 31 3 70 5 92 4 Q 100 5 100 14',
  'C 100 36 99 64 100 87 Q 100 96 92 95',
  'C 67 97 34 94 8 96 Q 0 94 0 86',
  'C 0 63 1 34 0 12 Z',
].join(' ')
const SCRIBBLE_ACCENT_PATH = [
  'M 3 8 C 28 6 69 8 97 7',
  'M 100 18 C 98 39 101 68 98 91',
  'M 91 96 C 64 94 33 97 7 94',
  'M 0 82 C 2 61 -1 37 2 17',
].join(' ')

export const SCRIBBLE_MASK_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="${SCRIBBLE_BORDER_PATH}" fill="white"/></svg>`,
)}")`

interface PScribbleFrameProps {
  readonly class?: string
}

export const PScribbleFrame = (props: PScribbleFrameProps) => (
  <svg
    aria-hidden="true"
    class={cx('pointer-events-none absolute inset-0 h-full w-full overflow-visible', props.class)}
    preserveAspectRatio="none"
    viewBox="0 0 100 100"
  >
    <path
      d={SCRIBBLE_BORDER_PATH}
      fill="none"
      stroke="rgb(0 0 0 / 92%)"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="6"
      vector-effect="non-scaling-stroke"
    />
    <path
      d={SCRIBBLE_ACCENT_PATH}
      fill="none"
      stroke="rgb(0 0 0 / 48%)"
      stroke-linecap="round"
      stroke-width="3"
      vector-effect="non-scaling-stroke"
    />
  </svg>
)
