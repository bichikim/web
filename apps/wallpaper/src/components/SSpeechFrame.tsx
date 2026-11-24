import type {ChatTone} from '../features/codex'
import {
  type SpeechAnchor,
  speechOutline,
  type SpeechPoint,
  speechTail,
  useElementRect,
} from '../features/speech'
import {createMemo, createSignal, Show} from 'solid-js'

interface SSpeechFrameProps {
  readonly tone?: ChatTone
  readonly target?: SpeechPoint
  readonly anchor?: SpeechAnchor
  readonly layout?: number
  readonly moving?: boolean
}
const BORDER_INSET = 0.5
export const SSpeechFrame = (props: SSpeechFrameProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const rect = useElementRect({
    element,
    layout: () => [props.target, props.anchor, props.layout],
    moving: () => props.moving ?? false,
  })
  const tail = createMemo(() => {
    const bounds = rect()
    const point = props.target
    return bounds === null || point === undefined
      ? null
      : speechTail({
          height: bounds.height - 1,
          width: bounds.width - 1,
          x: point.x - bounds.x - BORDER_INSET,
          y: point.y - bounds.y - BORDER_INSET,
        })
  })
  const outline = createMemo(() => {
    const bounds = rect()
    return bounds === null
      ? ''
      : speechOutline({height: bounds.height - 1, tail: tail(), width: bounds.width - 1})
  })
  return (
    <div
      ref={setElement}
      aria-hidden="true"
      data-tone={props.tone}
      data-anchor={props.anchor ?? 'bottom'}
      class="wallpaper-speech-frame wallpaper-speech-shadow pointer-events-auto absolute inset-x-0 bottom-0
      data-[anchor=top]:bottom-auto data-[anchor=top]:top-0
      box-border rounded-xl border border-solid border-transparent bg-transparent fill-white stroke-stone-300
      data-[tone=blue]:fill-blue-50 data-[tone=blue]:stroke-blue-300
      data-[tone=teal]:fill-teal-50 data-[tone=teal]:stroke-teal-300
      data-[tone=violet]:fill-violet-50 data-[tone=violet]:stroke-violet-300
      data-[tone=rose]:fill-rose-50 data-[tone=rose]:stroke-rose-300
      data-[tone=amber]:fill-amber-50 data-[tone=amber]:stroke-amber-300
      data-[tone=sky]:fill-sky-50 data-[tone=sky]:stroke-sky-300"
    >
      <Show when={rect()}>
        {(bounds) => (
          <svg
            aria-hidden="true"
            data-edge={tail()?.edge}
            data-corner={tail()?.corner}
            viewBox={`-${BORDER_INSET} -${BORDER_INSET} ${bounds().width} ${bounds().height}`}
            class="pointer-events-none absolute -left-px -top-px
            h-[calc(100%+2px)] w-[calc(100%+2px)] overflow-visible [fill:inherit] [stroke:inherit]"
          >
            <path d={outline()} class="[stroke-width:1] [stroke-linejoin:round]" />
          </svg>
        )}
      </Show>
    </div>
  )
}
