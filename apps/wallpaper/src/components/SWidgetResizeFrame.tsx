import {text as uiText} from '../features/localization'
import {For} from 'solid-js'
import type {WidgetResizeDirection} from '../features/poffo/types'

interface ResizeHandle {
  readonly direction: WidgetResizeDirection
  readonly label: string
  readonly position: string
}
const HANDLES: readonly ResizeHandle[] = [
  {
    direction: 'NorthWest',
    get label() {
      return uiText('왼쪽 위')
    },
    position: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  },
  {
    direction: 'North',
    get label() {
      return uiText('위')
    },
    position: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  },
  {
    direction: 'NorthEast',
    get label() {
      return uiText('오른쪽 위')
    },
    position: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  },
  {
    direction: 'East',
    get label() {
      return uiText('오른쪽')
    },
    position: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  },
  {
    direction: 'SouthEast',
    get label() {
      return uiText('오른쪽 아래')
    },
    position: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  },
  {
    direction: 'South',
    get label() {
      return uiText('아래')
    },
    position: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  },
  {
    direction: 'SouthWest',
    get label() {
      return uiText('왼쪽 아래')
    },
    position: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  },
  {
    direction: 'West',
    get label() {
      return uiText('왼쪽')
    },
    position: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  },
]
interface SWidgetResizeFrameProps {
  readonly disabled?: boolean
  readonly onResize: (direction: WidgetResizeDirection, event: PointerEvent) => void
  readonly onFinish: () => void
}

export const SWidgetResizeFrame = (props: SWidgetResizeFrameProps) => (
  <div
    role="group"
    aria-label={uiText('위젯 크기 및 위치 조정')}
    class="pointer-events-none absolute inset-2 border border-solid border-blue-600"
  >
    <For each={HANDLES}>
      {(handle) => {
        const handleResize = (event: PointerEvent) => props.onResize(handle.direction, event)
        return (
          <button
            type="button"
            aria-label={uiText('{value0} 크기 조정', {value0: String(handle.label)})}
            disabled={props.disabled}
            class={`pointer-events-auto absolute box-border h-4 w-4 touch-none border border-solid border-blue-600
              bg-white p-0 focus-visible:outline-solid focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${handle.position}`}
            onPointerDown={handleResize}
          />
        )
      }}
    </For>
    <button
      type="button"
      disabled={props.disabled}
      class="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 cursor-pointer
        whitespace-nowrap rounded-md border border-solid border-blue-700 bg-white px-3 py-1.5
        text-xs text-blue-800 shadow-sm [font-family:inherit] hover:bg-blue-50
        focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
      onClick={() => props.onFinish()}
    >
      {uiText('조정 완료')}
    </button>
  </div>
)
