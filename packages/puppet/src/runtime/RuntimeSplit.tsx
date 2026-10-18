import {createSignal, type JSX, Show} from 'solid-js'
interface RuntimeSplitProps {
  readonly studio?: boolean
  readonly children: JSX.Element
}
const INITIAL_WIDTH = 40
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
  const [width, setWidth] = createSignal(INITIAL_WIDTH)
  let container: HTMLDivElement | undefined
  const resize = (event: PointerEvent) => {
    if (
      event.currentTarget instanceof HTMLElement &&
      event.currentTarget.hasPointerCapture(event.pointerId) &&
      container !== undefined
    ) {
      const bounds = container.getBoundingClientRect()
      setWidth(
        Math.min(
          MAXIMUM_WIDTH,
          Math.max(MINIMUM_WIDTH, ((event.clientX - bounds.left) / bounds.width) * PERCENT),
        ),
      )
    }
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      setWidth((value) =>
        Math.min(
          MAXIMUM_WIDTH,
          Math.max(MINIMUM_WIDTH, value + (event.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP)),
        ),
      )
    }
  }
  return (
    <div
      ref={(element) => {
        container = element
      }}
      class={props.studio ? 'puppet-studio-split' : 'puppet-runtime-body'}
      style={{'--studio-stage-width': `${width()}%`}}
    >
      {props.children}
      <Show when={props.studio}>
        <div
          role="separator"
          tabIndex={0}
          aria-label="모델·그래프 너비 조절"
          aria-orientation="vertical"
          aria-valuemin={MINIMUM_WIDTH}
          aria-valuemax={MAXIMUM_WIDTH}
          aria-valuenow={Math.round(width())}
          class="puppet-studio-resizer"
          onPointerDown={handleResizeStart}
          onPointerMove={resize}
          onKeyDown={keydown}
        />
      </Show>
    </div>
  )
}
