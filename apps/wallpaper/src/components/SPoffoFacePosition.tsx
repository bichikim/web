import {createSignal} from 'solid-js'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {usePointDrag} from '../features/tracking/use-point-drag'
interface SPoffoFacePositionProps {
  readonly value?: PoffoTrackingOptions
  readonly onPreview?: (options: PoffoTrackingOptions | null) => void
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
const PERCENT = 100
const stopPropagation = (event: Event) => event.stopPropagation()
export const SPoffoFacePosition = (props: SPoffoFacePositionProps) => {
  const [area, setArea] = createSignal<HTMLDivElement | null>(null)
  const movement = usePointDrag({
    bounds: () => ({maxX: 1, maxY: 1, minX: 0, minY: 0}),
    disabled: () => props.onChange === undefined,
    onChange: (point) => props.onChange?.({...props.value, faceX: point.x, faceY: point.y}),
    onPreview: (point) =>
      props.onPreview?.(point === null ? null : {...props.value, faceX: point.x, faceY: point.y}),
    rect: () => area()?.getBoundingClientRect(),
    value: () => ({
      x: props.value?.faceX ?? DEFAULT_TRACKING_OPTIONS.faceX,
      y: props.value?.faceY ?? DEFAULT_TRACKING_OPTIONS.faceY,
    }),
  })
  return (
    <div
      ref={setArea}
      class="pointer-events-none absolute inset-0"
      onPointerDown={stopPropagation}
      onKeyDown={stopPropagation}
    >
      <button
        type="button"
        aria-label="얼굴 기준 조정"
        title="얼굴 중심으로 드래그"
        disabled={props.onChange === undefined}
        class="wallpaper-tracking-handle pointer-events-auto h-8 w-8"
        style={{
          '--point-x': `${movement.point().x * PERCENT}%`,
          '--point-y': `${movement.point().y * PERCENT}%`,
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
          class="block h-5 w-5 shrink-0 fill-none stroke-current [stroke-width:1.5] [stroke-linecap:round]"
        >
          <circle cx="12" cy="12" r="6" />
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          <circle cx="12" cy="12" r="1" class="fill-current stroke-none" />
        </svg>
      </button>
    </div>
  )
}
