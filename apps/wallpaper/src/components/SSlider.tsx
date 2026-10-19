import {createSignal} from 'solid-js'
import {usePointDrag} from '../features/tracking/use-point-drag'

interface SSliderProps {
  readonly label: string
  readonly value?: number
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly disabled?: boolean
  readonly onPreview?: (value: number | null) => void
  readonly onChange?: (value: number) => void | Promise<void>
}
const DEFAULT_STEP = 0.1
const DECIMAL_PLACES = 4
const PERCENT = 100
export const SSlider = (props: SSliderProps) => {
  const [area, setArea] = createSignal<HTMLDivElement | null>(null)
  const min = () => props.min ?? 0
  const max = () => props.max ?? 1
  const disabled = () => props.disabled === true || props.onChange === undefined
  const round = (value: number) => {
    const step = props.step ?? DEFAULT_STEP
    return Number((Math.round(value / step) * step).toFixed(DECIMAL_PLACES))
  }
  const movement = usePointDrag({
    bounds: () => ({maxX: max(), maxY: 0, minX: min(), minY: 0}),
    disabled,
    onChange: (point) => props.onChange?.(round(point.x)),
    onPreview: (point) => props.onPreview?.(point === null ? null : round(point.x)),
    rect: () => area()?.getBoundingClientRect(),
    step: () => props.step ?? DEFAULT_STEP,
    value: () => ({x: props.value ?? min(), y: 0}),
  })
  const value = () => (movement.dragging() ? round(movement.point().x) : movement.point().x)
  const percent = () => ((value() - min()) / (max() - min())) * PERCENT
  const handleStart = (event: PointerEvent & {currentTarget: HTMLDivElement}) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const initial =
      event.target instanceof Element && event.target.closest('[data-handle]') !== null
        ? undefined
        : {x: min() + ((event.clientX - rect.left) / rect.width) * (max() - min()), y: 0}
    movement.start(event, initial)
  }
  const handleKeyboard = (event: KeyboardEvent) => {
    if (disabled()) {
      return
    }
    switch (event.key) {
      case 'Home':
      case 'End':
        event.preventDefault()
        return props.onChange?.(event.key === 'Home' ? min() : max())
      case 'ArrowUp':
        return movement.keyboard({key: 'ArrowRight', preventDefault: () => event.preventDefault()})
      case 'ArrowDown':
        return movement.keyboard({key: 'ArrowLeft', preventDefault: () => event.preventDefault()})
      default:
        return movement.keyboard(event)
    }
  }
  return (
    <div
      role="slider"
      aria-label={props.label}
      aria-orientation="horizontal"
      aria-valuemin={min()}
      aria-valuemax={max()}
      aria-valuenow={value()}
      aria-valuetext={`${value()}배`}
      aria-disabled={disabled()}
      tabindex={disabled() ? -1 : 0}
      ref={setArea}
      class="relative h-8 min-w-0 cursor-pointer touch-none rounded
        focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-blue-700 aria-disabled:cursor-default aria-disabled:opacity-40"
      style={{'--slider-position': `${percent()}%`}}
      onPointerDown={handleStart}
      onPointerMove={movement.move}
      onPointerUp={movement.finish}
      onPointerCancel={movement.cancel}
      onLostPointerCapture={movement.cancel}
      onKeyDown={handleKeyboard}
    >
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-stone-300"
      />
      <span
        aria-hidden="true"
        class="pointer-events-none absolute left-0 top-1/2 h-1 w-[var(--slider-position)]
          -translate-y-1/2 rounded-full bg-blue-700"
      />
      <span
        data-handle
        aria-hidden="true"
        class="absolute left-[var(--slider-position)] top-1/2 box-border h-5 w-5
          -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-solid border-white bg-blue-700 shadow-sm"
      />
    </div>
  )
}
