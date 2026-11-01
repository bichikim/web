import {createSignal, Show} from 'solid-js'
import {BezierEdge, type EdgeProps, useSolidFlow, type XYPosition} from '@dschz/solid-flow'
import {useMappingGraph} from './context'
const HANDLE_OFFSET = 24
const HANDLE_RADIUS = 9
export const MappingEdge = (props: EdgeProps) => {
  const graph = useMappingGraph()
  const flow = useSolidFlow()
  const [pointer, setPointer] = createSignal<XYPosition | null>(null)
  let dragPointer: number | undefined
  const input = () => props.target.startsWith('mapping:')
  const start = (event: PointerEvent & {currentTarget: SVGCircleElement}) => {
    if (event.button !== 0 || dragPointer !== undefined) {
      return
    }
    event.stopPropagation()
    event.preventDefault()
    dragPointer = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setPointer(flow.screenToFlowPosition({x: event.clientX, y: event.clientY}))
  }
  const move = (event: PointerEvent) => {
    if (dragPointer === event.pointerId) {
      setPointer(flow.screenToFlowPosition({x: event.clientX, y: event.clientY}))
    }
  }
  const finish = (event: PointerEvent & {currentTarget: SVGCircleElement}) => {
    if (dragPointer !== event.pointerId) {
      return
    }
    event.stopPropagation()
    dragPointer = undefined
    setPointer(null)
    const handle = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-nodeid]')
    const node = handle?.getAttribute('data-nodeid')
    if (node === null || node === undefined) {
      return
    }
    const identifier = handle?.getAttribute('data-handleid') ?? null
    const connection = input()
      ? {
          source: node,
          sourceHandle: identifier,
          target: props.target,
          targetHandle: props.targetHandleId,
        }
      : {
          previousId: props.source.startsWith('mapping:')
            ? undefined
            : (props.targetHandleId ?? undefined),
          source: props.source,
          sourceHandle: props.sourceHandleId,
          target: node,
          targetHandle: identifier,
        }
    graph.onConnect(connection)
  }
  const cancel = (event: PointerEvent) => {
    if (dragPointer === event.pointerId) {
      dragPointer = undefined
      setPointer(null)
    }
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      graph.onEdit()
    }
  }
  return (
    <>
      <BezierEdge
        {...props}
        type="default"
        sourceX={input() ? (pointer()?.x ?? props.sourceX) : props.sourceX}
        sourceY={input() ? (pointer()?.y ?? props.sourceY) : props.sourceY}
        targetX={input() ? props.targetX : (pointer()?.x ?? props.targetX)}
        targetY={input() ? props.targetY : (pointer()?.y ?? props.targetY)}
      />
      <Show when={props.selected}>
        <circle
          class="puppet-edge-handle nopan nodrag"
          role="button"
          tabIndex={0}
          aria-label={input() ? '입력 연결 끝 이동' : '출력 연결 끝 이동'}
          cx={input() ? props.sourceX + HANDLE_OFFSET : props.targetX - HANDLE_OFFSET}
          cy={input() ? props.sourceY : props.targetY}
          r={HANDLE_RADIUS}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={cancel}
          onLostPointerCapture={cancel}
          onKeyDown={keydown}
        />
      </Show>
    </>
  )
}
