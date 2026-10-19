import {createEffect, createSignal, on} from 'solid-js'
import {
  DEFAULT_POFFO_SPEECH,
  POFFO_SPEECH_BOUNDS,
  type PoffoSpeech,
} from '@winter-love/wallpaper/settings/library-model'
import {usePointDrag} from '../features/tracking/use-point-drag'

interface SPoffoSpeechPositionProps {
  readonly targetId?: string
  readonly value?: PoffoSpeech
  readonly onChange?: (speech: PoffoSpeech) => void | Promise<void>
}
const PERCENT = 100
const STEP = 0.05
const FACE_Y = 0.3

export const SPoffoSpeechPosition = (props: SPoffoSpeechPositionProps) => {
  const [area, setArea] = createSignal<HTMLDivElement | null>(null)
  const value = () => props.value ?? DEFAULT_POFFO_SPEECH
  const movement = usePointDrag({
    bounds: () => POFFO_SPEECH_BOUNDS,
    disabled: () => props.onChange === undefined,
    onChange: (point) =>
      props.onChange?.({...value(), x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2))}),
    rect: () => area()?.getBoundingClientRect(),
    step: () => STEP,
    value: () => ({x: value().x, y: value().y}),
    view: () => ({maxX: 1, maxY: 1, minX: 0, minY: 0}),
  })
  createEffect(on(() => props.targetId, movement.cancel))
  return (
    <div
      ref={setArea}
      role="group"
      aria-label="말풍선 위치"
      class="pointer-events-none absolute inset-0"
    >
      <button
        type="button"
        aria-label="말풍선 위치 조정"
        title="끌어서 말풍선 위치 조정"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Escape"
        disabled={props.onChange === undefined}
        class="pointer-events-auto absolute flex min-h-9 min-w-9 touch-none items-center gap-1.5
          cursor-grab rounded-lg border border-solid border-blue-300 bg-white/95 px-2 py-1.5
          text-[11px] leading-4 text-blue-800 shadow-sm active:cursor-grabbing
          [left:var(--speech-x)] [top:var(--speech-y)]
          focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-blue-700"
        classList={{
          '-translate-y-full': movement.point().y <= FACE_Y,
          'border-dashed opacity-60': !value().enabled,
        }}
        style={{
          '--speech-x': `${movement.point().x * PERCENT}%`,
          '--speech-y': `${movement.point().y * PERCENT}%`,
        }}
        onPointerDown={movement.start}
        onPointerMove={movement.move}
        onPointerUp={movement.finish}
        onPointerCancel={movement.cancel}
        onLostPointerCapture={movement.cancel}
        onKeyDown={movement.keyboard}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          class="h-3.5 w-3.5 shrink-0 fill-none stroke-current [stroke-width:1.6]"
        >
          <path d="M4 3h16v13H9l-5 5V3Z" />
          <path d="M8 7h8M8 11h5" />
        </svg>
        <span class="whitespace-nowrap">말풍선</span>
      </button>
    </div>
  )
}
