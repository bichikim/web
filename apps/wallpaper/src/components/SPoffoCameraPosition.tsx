import {children, createEffect, createMemo, createSignal, type JSX, on, Show} from 'solid-js'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {usePointDrag} from '../features/tracking/use-point-drag'
interface SPoffoCameraPositionProps {
  readonly enabled?: boolean
  readonly children?: JSX.Element
  readonly actions?: JSX.Element
  readonly calibrating?: boolean
  readonly value?: PoffoTrackingOptions
  readonly aspect?: number
  readonly onPreview?: (options: PoffoTrackingOptions | null) => void
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
const PERCENT = 100
const VIEW_CENTER = 0.5
const VIEW_MARGIN = 0
const DEFAULT_RADIUS = 0.5
const DEFAULT_ASPECT = {height: 9, width: 16}
export const SPoffoCameraPosition = (props: SPoffoCameraPositionProps) => {
  const content = children(() => props.children)
  const [area, setArea] = createSignal<HTMLDivElement | null>(null)
  const [outside, setOutside] = createSignal(false)
  const saved = () => ({
    x: props.value?.cameraX ?? DEFAULT_TRACKING_OPTIONS.cameraX,
    y: props.value?.cameraY ?? DEFAULT_TRACKING_OPTIONS.cameraY,
  })
  const enabled = () => props.enabled ?? true
  const calibrating = () => enabled() && (props.calibrating ?? true)
  const radius = createMemo(() => {
    if (!calibrating()) {
      return DEFAULT_RADIUS
    }
    const point = saved()
    return Math.max(
      DEFAULT_RADIUS,
      Math.abs(point.x - VIEW_CENTER) + VIEW_MARGIN,
      Math.abs(point.y - VIEW_CENTER) + VIEW_MARGIN,
    )
  })
  const view = createMemo(() =>
    outside() && calibrating()
      ? {max: TRACKING_LIMITS.cameraX.max, min: TRACKING_LIMITS.cameraX.min}
      : {
          max: Math.min(TRACKING_LIMITS.cameraX.max, VIEW_CENTER + radius()),
          min: Math.max(TRACKING_LIMITS.cameraX.min, VIEW_CENTER - radius()),
        },
  )
  const position = (value: number) => {
    const bounds = view()
    return ((value - bounds.min) / (bounds.max - bounds.min)) * PERCENT
  }
  const update = (point: {readonly x: number; readonly y: number}) =>
    props.onChange?.({...props.value, cameraX: point.x, cameraY: point.y})
  const movement = usePointDrag({
    bounds: () => ({
      maxX: TRACKING_LIMITS.cameraX.max,
      maxY: TRACKING_LIMITS.cameraY.max,
      minX: TRACKING_LIMITS.cameraX.min,
      minY: TRACKING_LIMITS.cameraY.min,
    }),
    disabled: () => props.onChange === undefined,
    onChange: update,
    onPreview: (point) =>
      props.onPreview?.(
        point === null ? null : {...props.value, cameraX: point.x, cameraY: point.y},
      ),
    rect: () => area()?.getBoundingClientRect(),
    value: saved,
    view: () => {
      const bounds = view()
      return {maxX: bounds.max, maxY: bounds.max, minX: bounds.min, minY: bounds.min}
    },
  })
  createEffect(on(calibrating, movement.cancel))
  const handleView = () => setOutside((value) => !value)
  return (
    <section
      aria-label={enabled() ? '카메라 위치 미리보기' : undefined}
      class="relative box-border w-full"
      classList={{'h-full': !enabled(), 'p-5': calibrating()}}
    >
      <div
        ref={setArea}
        class="relative box-border w-full"
        classList={{
          '[aspect-ratio:var(--camera-aspect)]': enabled(),
          'h-full': !enabled(),
          'rounded-lg border border-dashed border-stone-300 bg-stone-100': calibrating(),
        }}
        style={{'--camera-aspect': props.aspect ?? DEFAULT_ASPECT.width / DEFAULT_ASPECT.height}}
      >
        <div
          class="absolute box-border bg-stone-200
            [left:var(--screen-left)] [top:var(--screen-top)]
            [width:var(--screen-size)] [height:var(--screen-size)]"
          classList={{'rounded border border-solid border-stone-300': calibrating()}}
          style={{
            '--screen-left': `${position(0)}%`,
            '--screen-size': `${PERCENT / (view().max - view().min)}%`,
            '--screen-top': `${position(0)}%`,
          }}
        >
          <Show when={content()} fallback={<span aria-hidden="true">모니터</span>}>
            {content()}
          </Show>
        </div>
        <Show when={calibrating()}>
          <button
            type="button"
            aria-label="카메라 위치 조정"
            title="카메라 설치 위치로 드래그"
            disabled={props.onChange === undefined}
            class="wallpaper-tracking-handle h-9 w-9"
            style={{
              '--point-x': `${position(movement.point().x)}%`,
              '--point-y': `${position(movement.point().y)}%`,
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
              class="block h-5 w-5 shrink-0 fill-none stroke-current [stroke-width:1.6]
              [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="m8 4-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2l-2-3Z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </Show>
      </div>
      <div class="absolute right-2 top-2 flex items-center gap-2">
        <Show when={calibrating()}>
          <button
            type="button"
            class="wallpaper-file-button"
            aria-pressed={outside()}
            onClick={handleView}
          >
            화면 밖 보기
          </button>
        </Show>
        {props.actions}
      </div>
    </section>
  )
}
