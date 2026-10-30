import type {ChatTone} from '../features/codex'
import {
  bubblePath,
  type SpeechAnchor,
  type SpeechPoint,
  speechTail,
  useElementRect,
} from '../features/speech'
import {createMemo, createSignal} from 'solid-js'

interface SSpeechFrameProps {
  readonly tone?: ChatTone
  readonly target?: SpeechPoint
  readonly anchor?: SpeechAnchor
  readonly layout?: number
  readonly moving?: boolean
}
const DEFAULT_WIDTH = 272
const DEFAULT_HEIGHT = 120
export const SSpeechFrame = (props: SSpeechFrameProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const rect = useElementRect({
    element,
    layout: () => [props.target, props.layout],
    moving: () => props.moving ?? false,
    resizeImmediately: () => true,
  })
  const size = createMemo(() => {
    const bounds = rect()
    return {height: bounds?.height ?? DEFAULT_HEIGHT, width: bounds?.width ?? DEFAULT_WIDTH}
  })
  const tail = createMemo(() => {
    const bounds = rect()
    const point = props.target
    return bounds === null || point === undefined
      ? null
      : speechTail({
          height: bounds.height,
          width: bounds.width,
          x: point.x - bounds.x,
          y: point.y - bounds.y,
        })
  })
  const geometry = createMemo(() => {
    const dimensions = size()
    const current = element()
    const reveal =
      current === null
        ? 1
        : Number.parseFloat(getComputedStyle(current).getPropertyValue('--speech-reveal'))
    return {...dimensions, anchor: props.anchor, reveal: Number.isFinite(reveal) ? reveal : 1}
  })
  const body = createMemo(() => bubblePath(geometry()))
  const outline = createMemo(() => bubblePath({...geometry(), tail: tail()}))
  return (
    <div
      ref={setElement}
      aria-hidden="true"
      data-tone={props.tone ?? 'violet'}
      data-anchor={props.anchor ?? 'bottom'}
      class="wallpaper-speech-frame wallpaper-speech-violet
      data-[tone=blue]:wallpaper-speech-blue
      data-[tone=teal]:wallpaper-speech-teal
      data-[tone=violet]:wallpaper-speech-violet
      data-[tone=rose]:wallpaper-speech-rose
      data-[tone=amber]:wallpaper-speech-amber
      data-[tone=sky]:wallpaper-speech-sky pointer-events-none absolute inset-x-0 bottom-0
      data-[anchor=top]:bottom-auto data-[anchor=top]:top-0"
    >
      <svg
        viewBox={`0 0 ${size().width} ${size().height}`}
        preserveAspectRatio="none"
        data-edge={tail()?.edge}
        class="absolute inset-0 h-full w-full overflow-visible"
      >
        <path
          data-speech-shadow
          d={outline()}
          class="fill-[var(--speech-shadow)] stroke-[var(--speech-shadow)] stroke-3 wallpaper-speech-shadow
          pointer-events-none [stroke-linejoin:round]"
        />
        <path
          data-speech-outline
          d={outline()}
          class="fill-white stroke-[var(--speech-ink)] stroke-3 pointer-events-none
          [stroke-linejoin:round] [stroke-linecap:round]"
        />
        <path
          data-speech-body
          d={body()}
          class="fill-transparent stroke-none [pointer-events:fill]"
        />
        <g data-speech-emphasis class="fill-[var(--speech-accent)] pointer-events-none">
          <path d="M15 -8 L24 -12 L29 1 L21 5 Z" />
          <path d="M0 5 L6 -2 L17 8 L11 14 Z" />
        </g>
      </svg>
    </div>
  )
}
