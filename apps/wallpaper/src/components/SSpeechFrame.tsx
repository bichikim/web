import type {ChatTone} from '../features/codex'
import {type SpeechAnchor, type SpeechPoint, speechTail, useElementRect} from '../features/speech'
import {createMemo, createSignal} from 'solid-js'
import {SSpeechTail} from './SSpeechTail'

interface SSpeechFrameProps {
  readonly tone?: ChatTone
  readonly target?: SpeechPoint
  readonly anchor?: SpeechAnchor
  readonly layout?: number
  readonly moving?: boolean
}
export const SSpeechFrame = (props: SSpeechFrameProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const rect = useElementRect({
    element,
    layout: () => [props.target, props.layout],
    moving: () => props.moving ?? false,
  })
  const tail = createMemo(() => {
    const bounds = rect()
    const point = props.target
    return bounds === null || point === undefined
      ? null
      : speechTail({
          height: bounds.height - 2,
          width: bounds.width - 2,
          x: point.x - bounds.x - 1,
          y: point.y - bounds.y - 1,
        })
  })
  return (
    <div
      ref={setElement}
      aria-hidden="true"
      data-tone={props.tone}
      data-anchor={props.anchor ?? 'bottom'}
      class="wallpaper-speech-frame wallpaper-speech-shadow pointer-events-auto absolute inset-x-0 bottom-0
      data-[anchor=top]:bottom-auto data-[anchor=top]:[top:var(--speech-frame-inset)]
      box-border rounded-xl border border-solid border-stone-300 bg-white
      data-[tone=blue]:bg-blue-50 data-[tone=blue]:border-blue-300
      data-[tone=teal]:bg-teal-50 data-[tone=teal]:border-teal-300
      data-[tone=violet]:bg-violet-50 data-[tone=violet]:border-violet-300
      data-[tone=rose]:bg-rose-50 data-[tone=rose]:border-rose-300
      data-[tone=amber]:bg-amber-50 data-[tone=amber]:border-amber-300
      data-[tone=sky]:bg-sky-50 data-[tone=sky]:border-sky-300
      [&>[data-edge=bottom]]:top-full [&>[data-edge=right]]:left-full"
    >
      <SSpeechTail value={tail()} />
    </div>
  )
}
