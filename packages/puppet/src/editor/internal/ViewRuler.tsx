import {createEffect, createSignal, For, onCleanup, Show} from 'solid-js'
import {getRulerTicks} from './ruler'

interface ViewRulerProps {
  readonly vertical?: boolean
  readonly offset: number
  readonly zoom: number
}

export const ViewRuler = (props: ViewRulerProps) => {
  const MAJOR_START = 14
  const MINOR_START = 18
  const EDGE = 24
  const LABEL_BASELINE = 10
  const LABEL_OFFSET = 3
  const [host, setHost] = createSignal<SVGSVGElement>()
  const [length, setLength] = createSignal(0)
  createEffect(() => {
    const element = host()
    const {vertical} = props
    if (element === undefined || typeof ResizeObserver === 'undefined') {
      return
    }
    const update = () => setLength(vertical ? element.clientHeight : element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })
  return (
    <svg
      ref={setHost}
      class="view-ruler"
      data-vertical={props.vertical === true}
      role="img"
      aria-label={props.vertical ? '세로 좌표 자' : '가로 좌표 자'}
    >
      <For each={getRulerTicks(props.offset, props.zoom, length())}>
        {(tick) => (
          <g>
            <line
              x1={props.vertical ? (tick.major ? MAJOR_START : MINOR_START) : tick.position}
              x2={props.vertical ? EDGE : tick.position}
              y1={props.vertical ? tick.position : tick.major ? MAJOR_START : MINOR_START}
              y2={props.vertical ? tick.position : EDGE}
            />
            <Show when={tick.major}>
              <text
                x={props.vertical ? LABEL_BASELINE : tick.position + LABEL_OFFSET}
                y={props.vertical ? tick.position - LABEL_OFFSET : LABEL_BASELINE}
                transform={
                  props.vertical
                    ? `rotate(-90 ${LABEL_BASELINE} ${tick.position - LABEL_OFFSET})`
                    : undefined
                }
              >
                {tick.value}
              </text>
            </Show>
          </g>
        )}
      </For>
    </svg>
  )
}
