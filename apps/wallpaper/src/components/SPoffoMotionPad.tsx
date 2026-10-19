import {createMemo, createSignal} from 'solid-js'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
  TRACKING_LIMITS,
} from '@winter-love/wallpaper/settings/tracking'
import {usePointDrag} from '../features/tracking/use-point-drag'
import type {TrackingPoint} from '../features/tracking/types'
import {SPoffoMotionCoordinates} from './SPoffoMotionCoordinates'

interface SPoffoMotionPadProps {
  readonly label: string
  readonly fields: readonly [keyof PoffoTrackingOptions, keyof PoffoTrackingOptions]
  readonly value?: PoffoTrackingOptions
  readonly step?: number
  readonly onPreview?: (options: PoffoTrackingOptions | null) => void
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}
const PERCENT = 100
export const SPoffoMotionPad = (props: SPoffoMotionPadProps) => {
  const [area, setArea] = createSignal<HTMLDivElement | null>(null)
  const bounds = createMemo(() => ({
    maxX: TRACKING_LIMITS[props.fields[0]].max,
    maxY: -TRACKING_LIMITS[props.fields[1]].min,
    minX: TRACKING_LIMITS[props.fields[0]].min,
    minY: -TRACKING_LIMITS[props.fields[1]].max,
  }))
  const view = bounds
  const round = (value: number) => {
    const step = props.step ?? 1
    return Number((Math.round(value / step) * step).toFixed(2))
  }
  const values = (point: TrackingPoint): PoffoTrackingOptions => ({
    ...props.value,
    [props.fields[0]]: round(point.x),
    [props.fields[1]]: round(-point.y),
  })
  const movement = usePointDrag({
    bounds,
    disabled: () => props.onChange === undefined,
    onChange: (point) => props.onChange?.(values(point)),
    onPreview: (point) => props.onPreview?.(point === null ? null : values(point)),
    rect: () => area()?.getBoundingClientRect(),
    step: () => props.step ?? 1,
    value: () => ({
      x: props.value?.[props.fields[0]] ?? DEFAULT_TRACKING_OPTIONS[props.fields[0]],
      y: -(props.value?.[props.fields[1]] ?? DEFAULT_TRACKING_OPTIONS[props.fields[1]]),
    }),
    view,
  })
  const position = createMemo(() => {
    const point = movement.point()
    const current = view()
    return {
      x: ((point.x - current.minX) / (current.maxX - current.minX)) * PERCENT,
      y: ((point.y - current.minY) / (current.maxY - current.minY)) * PERCENT,
    }
  })
  const handleStart = (event: PointerEvent & {currentTarget: HTMLDivElement}) => {
    const rectangle = event.currentTarget.getBoundingClientRect()
    const current = view()
    const handle = event.target instanceof Element && event.target.closest('button') !== null
    movement.start(
      event,
      handle
        ? undefined
        : {
            x:
              current.minX +
              ((event.clientX - rectangle.left) / rectangle.width) * (current.maxX - current.minX),
            y:
              current.minY +
              ((event.clientY - rectangle.top) / rectangle.height) * (current.maxY - current.minY),
          },
    )
  }
  return (
    <div role="group" aria-label={props.label} class="grid min-w-0 gap-2">
      <span class="text-[13px] font-medium text-stone-700">{props.label}</span>
      <div class="rounded-lg border border-solid border-stone-300 bg-stone-100/60 p-3">
        <div
          ref={setArea}
          tabindex={-1}
          class="relative h-32 touch-none outline-none"
          onPointerDown={handleStart}
          onPointerMove={movement.move}
          onPointerUp={movement.finish}
          onPointerCancel={movement.cancel}
          onLostPointerCapture={movement.cancel}
          onKeyDown={movement.keyboard}
        >
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-stone-500"
          />
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-stone-500"
          />
          <span
            aria-hidden="true"
            class="pointer-events-none absolute left-1/2 top-0 ml-2 text-[10px] text-stone-600"
          >
            위
          </span>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute right-0 top-1/2 mt-2 text-[10px] text-stone-600"
          >
            오른쪽
          </span>
          <button
            type="button"
            aria-label={`${props.label} 조정`}
            aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Escape"
            disabled={props.onChange === undefined}
            title="점을 끌어 기본 방향 조정"
            class="absolute box-border h-6 w-6 rounded-full cursor-grab active:cursor-grabbing
              -translate-x-1/2 -translate-y-1/2 touch-none
              border-2 border-solid border-white bg-blue-700 p-0 shadow-sm
              [left:var(--point-x)] [top:var(--point-y)]
              focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-blue-700 disabled:opacity-40"
            style={{'--point-x': `${position().x}%`, '--point-y': `${position().y}%`}}
          />
        </div>
      </div>
      <SPoffoMotionCoordinates
        fields={props.fields}
        value={props.value}
        display={values(movement.point())}
        step={props.step}
        onChange={props.onChange}
      />
    </div>
  )
}
