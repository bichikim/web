import {createSignal, type JSX} from 'solid-js'
interface RuntimeSplitProps {
  readonly studio?: boolean
  readonly children: JSX.Element
  /** Called before a user resize changes the split. Omitted, no resize notification is sent. */
  readonly onResize?: () => void
}
const INITIAL_STUDIO_WIDTH = 40
const INITIAL_VIEWER_WIDTH = 60
const MINIMUM_WIDTH = 25
const MAXIMUM_WIDTH = 75
const PERCENT = 100
const KEY_STEP = 2
const handleResizeStart = (event: PointerEvent & {currentTarget: HTMLDivElement}) => {
  if (event.button === 0) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
  }
}
export const RuntimeSplit = (props: RuntimeSplitProps) => {
  const [studioWidth, setStudioWidth] = createSignal(INITIAL_STUDIO_WIDTH)
  const [viewerWidth, setViewerWidth] = createSignal(INITIAL_VIEWER_WIDTH)
  const width = () => (props.studio ? studioWidth() : viewerWidth())
  const setWidth = (value: number) => {
    const clamped = Math.min(MAXIMUM_WIDTH, Math.max(MINIMUM_WIDTH, value))
    if (clamped === width()) {
      return
    }
    props.onResize?.()
    if (props.studio) {
      setStudioWidth(clamped)
    } else {
      setViewerWidth(clamped)
    }
  }
  let container: HTMLDivElement | undefined
  const resize = (event: PointerEvent) => {
    if (
      event.currentTarget instanceof HTMLElement &&
      event.currentTarget.hasPointerCapture(event.pointerId) &&
      container !== undefined
    ) {
      const bounds = container.getBoundingClientRect()
      if (bounds.width > 0) {
        setWidth(((event.clientX - bounds.left) / bounds.width) * PERCENT)
      }
    }
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      setWidth(width() + (event.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP))
    }
  }
  return (
    <div
      ref={(element) => {
        container = element
      }}
      class="puppet-runtime-split"
      style={{'--runtime-stage-width': `${width()}%`}}
    >
      {props.children}
      <div
        role="separator"
        tabIndex={0}
        aria-label={props.studio ? '모델·그래프 너비 조절' : '모델·도구 너비 조절'}
        aria-orientation="vertical"
        aria-valuemin={MINIMUM_WIDTH}
        aria-valuemax={MAXIMUM_WIDTH}
        aria-valuenow={Math.round(width())}
        class="puppet-runtime-resizer"
        onPointerDown={handleResizeStart}
        onPointerMove={resize}
        onKeyDown={keydown}
      />
    </div>
  )
}
