import {createMemo} from 'solid-js'
import type {TrackingRange} from '@winter-love/wallpaper/settings/tracking-range'
import {usePointDrag} from '../features/tracking/use-point-drag'
import type {TrackingPoint} from '../features/tracking/types'

interface SRangeHandleProps {
  readonly label: string
  readonly horizontal?: 'minX' | 'maxX'
  readonly vertical?: 'minY' | 'maxY'
  readonly value: TrackingRange
  readonly limit: number
  readonly step?: number
  readonly compact?: boolean
  readonly rectangle: () => DOMRect | undefined
  readonly onPreview?: (range: TrackingRange | null) => void
  readonly onChange?: (range: TrackingRange) => void | Promise<void>
}
const PERCENT = 100
export const SRangeHandle = (props: SRangeHandleProps) => {
  const moving = () => props.horizontal === undefined
  const horizontal = () => props.horizontal ?? 'minX'
  const vertical = () => props.vertical ?? 'minY'
  const width = () => props.value.maxX - props.value.minX
  const height = () => props.value.maxY - props.value.minY
  const bounds = createMemo(() => ({
    maxX: moving()
      ? props.limit - width()
      : props.horizontal === 'minX'
        ? props.value.maxX
        : props.limit,
    maxY: moving()
      ? props.limit - height()
      : props.vertical === 'minY'
        ? props.value.maxY
        : props.limit,
    minX: moving() || props.horizontal === 'minX' ? -props.limit : props.value.minX,
    minY: moving() || props.vertical === 'minY' ? -props.limit : props.value.minY,
  }))
  const range = (point: TrackingPoint): TrackingRange => {
    const step = props.step ?? 1
    const round = (value: number) => Number((Math.round(value / step) * step).toFixed(2))
    return moving()
      ? {
          maxX: round(point.x + width()),
          maxY: round(point.y + height()),
          minX: round(point.x),
          minY: round(point.y),
        }
      : {...props.value, [horizontal()]: round(point.x), [vertical()]: round(point.y)}
  }
  const movement = usePointDrag({
    bounds,
    disabled: () => props.onChange === undefined,
    onChange: (point) => props.onChange?.(range(point)),
    onPreview: (point) => props.onPreview?.(point === null ? null : range(point)),
    rect: () => props.rectangle(),
    step: () => props.step ?? 1,
    value: () => ({x: props.value[horizontal()], y: props.value[vertical()]}),
    view: () => ({maxX: props.limit, maxY: props.limit, minX: -props.limit, minY: -props.limit}),
  })
  const percent = (value: number) => `${((value + props.limit) / (2 * props.limit)) * PERCENT}%`
  return (
    <button
      type="button"
      aria-label={props.label}
      title={moving() ? '끌어서 범위 이동' : '끌어서 모서리 조정'}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Escape"
      disabled={props.onChange === undefined}
      class="absolute box-border touch-none border-solid border-blue-600 p-0
        [left:var(--range-x)] [top:var(--range-y)]
        before:pointer-events-none before:absolute before:left-1/2 before:top-1/2 before:box-border
        before:-translate-x-1/2 before:-translate-y-1/2 before:border before:border-solid
        before:border-blue-600 before:bg-blue-700 before:shadow-sm
        focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-blue-700 disabled:opacity-40"
      classList={{
        "before:content-['']": !moving(),
        'before:h-2.5 before:w-2.5 before:rounded-sm': !moving() && props.compact === true,
        'before:h-5 before:w-5 before:rounded': !moving() && props.compact !== true,
        'cursor-move border bg-blue-100/60 [width:var(--range-width)] [height:var(--range-height)] min-h-2 min-w-2':
          moving(),
        'cursor-nesw-resize': !moving() && props.horizontal !== props.vertical?.replace('Y', 'X'),
        'cursor-nwse-resize': !moving() && props.horizontal === props.vertical?.replace('Y', 'X'),
        'h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded border-0 bg-transparent': !moving(),
      }}
      style={{
        '--range-height': `${(height() / (2 * props.limit)) * PERCENT}%`,
        '--range-width': `${(width() / (2 * props.limit)) * PERCENT}%`,
        '--range-x': percent(movement.point().x),
        '--range-y': percent(movement.point().y),
      }}
      onPointerDown={movement.start}
      onPointerMove={movement.move}
      onPointerUp={movement.finish}
      onPointerCancel={movement.cancel}
      onLostPointerCapture={movement.cancel}
      onKeyDown={movement.keyboard}
    />
  )
}
