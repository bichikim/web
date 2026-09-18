import {cva, cx} from 'class-variance-authority'
import {createSignal, type JSX, Show, splitProps, untrack} from 'solid-js'
import {CONTROL_HEIGHT_CLASSES, CONTROL_PADDING_CLASSES} from '../control-size-classes'
import {type NumberInputRange, useNumberInputGesture} from './use-number-input-gesture'

const DEFAULT_STEP = 1
const EXTRA_PRECISION_DIGITS = 6
const MAX_PRECISION_DIGITS = 12
const NUMBER_INPUT_CLASSES = cva(
  'inline-flex box-border min-w-0 max-w-full overflow-hidden rounded-control border border-solid border-border ' +
    'bg-surface text-foreground transition-[border-color,box-shadow] duration-160 ' +
    'focus-within:border-highlight focus-within:shadow-focus motion-reduce:transition-none',
  {
    defaultVariants: {size: 'small'},
    variants: {
      size: CONTROL_HEIGHT_CLASSES,
    },
  },
)
const ARROW_CLASS =
  'grid h-full w-7 shrink-0 place-items-center border-0 bg-transparent p-0 text-muted-foreground ' +
  'outline-none transition-[background-color,color] duration-160 ' +
  '[&:not(:disabled):hover]:bg-surface-interactive [&:not(:disabled):hover]:text-foreground ' +
  'focus-visible:bg-surface-interactive focus-visible:text-foreground ' +
  'disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none'
const INPUT_CLASS =
  'box-border min-w-0 w-full border-0 bg-transparent px-2 text-center text-base ' +
  'leading-5 font-bold tabular-nums text-foreground outline-none cursor-ew-resize ' +
  'touch-pan-y [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ' +
  '[&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed disabled:opacity-45'
const INPUT_SIZE_CLASSES = {
  medium: `h-auto ${CONTROL_PADDING_CLASSES.medium}`,
  small: `h-auto ${CONTROL_PADDING_CLASSES.small}`,
} as const
const UNIT_CLASS =
  'pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-sm leading-5 ' +
  'font-bold text-muted-foreground'

type NativeInputProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  | 'aria-label'
  | 'class'
  | 'disabled'
  | 'max'
  | 'min'
  | 'onChange'
  | 'onInput'
  | 'readOnly'
  | 'size'
  | 'step'
  | 'type'
  | 'value'
>

export interface PNumberInputProps extends NativeInputProps {
  readonly 'aria-label': string
  readonly class?: string
  readonly decrementLabel?: string
  readonly disabled?: boolean
  readonly incrementLabel?: string
  readonly max?: number
  readonly min?: number
  readonly onInputValueChange?: (value: string) => void
  readonly onValueChange?: (value: number) => void
  readonly readOnly?: boolean
  readonly size?: 'medium' | 'small'
  readonly step?: number
  readonly unit?: string
  readonly value?: number | string
}

const toFiniteNumber = (value: number | undefined): number | undefined =>
  value !== undefined && Number.isFinite(value) ? value : undefined

const parseValue = (value: number | string | undefined): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (value === undefined || value.trim() === '') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const clamp = (value: number, min: number | undefined, max: number | undefined): number => {
  const lowerBoundedValue = min === undefined ? value : Math.max(value, min)
  return max === undefined ? lowerBoundedValue : Math.min(lowerBoundedValue, max)
}

const decimalPlaces = (value: number): number => {
  const [, decimalPart] = value.toString().split('.')
  return decimalPart?.length ?? 0
}

const snapToStep = (value: number, step: number, min: number | undefined): number => {
  const base = min ?? 0
  const snapped = base + Math.round((value - base) / step) * step
  return Number(
    snapped.toFixed(Math.min(decimalPlaces(step) + EXTRA_PRECISION_DIGITS, MAX_PRECISION_DIGITS)),
  )
}

const normalizeValue = (
  value: number,
  step: number,
  min: number | undefined,
  max: number | undefined,
): number => {
  const snapped = snapToStep(value, step, min)
  const bounded = clamp(snapped, min, max)
  return Object.is(bounded, -0) ? 0 : bounded
}

const getStep = (step: number | undefined): number =>
  step !== undefined && Number.isFinite(step) && step > 0 ? step : DEFAULT_STEP

const getRange = (min: number | undefined, max: number | undefined) => {
  const lowerBound = toFiniteNumber(min)
  const upperBound = toFiniteNumber(max)

  return {
    max: upperBound,
    min: lowerBound,
  }
}

export const PNumberInput = (props: PNumberInputProps) => {
  const [local, rest] = splitProps(props, [
    'aria-label',
    'class',
    'decrementLabel',
    'disabled',
    'incrementLabel',
    'max',
    'min',
    'onInputValueChange',
    'onValueChange',
    'readOnly',
    'size',
    'step',
    'unit',
    'value',
  ])
  const [uncontrolledValue, setUncontrolledValue] = createSignal(
    untrack(() => (local.value === undefined ? String(local.min ?? 0) : String(local.value))),
  )
  const getSize = () => local.size ?? 'small'

  const getBounds = (): NumberInputRange => getRange(local.min, local.max)
  const getCurrentValue = () => {
    const bounds = getBounds()
    const currentValue = parseValue(local.value === undefined ? uncontrolledValue() : local.value)
    return normalizeValue(currentValue ?? 0, getStep(local.step), bounds.min, bounds.max)
  }
  const emitValue = (value: number) => {
    const bounds = getBounds()
    const nextValue = normalizeValue(value, getStep(local.step), bounds.min, bounds.max)

    if (local.value === undefined) {
      setUncontrolledValue(String(nextValue))
    }
    local.onValueChange?.(nextValue)
  }
  const changeByStep = (direction: -1 | 1) => {
    emitValue(getCurrentValue() + direction * getStep(local.step))
  }

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    const nextValue = event.currentTarget.value
    if (local.value === undefined) {
      setUncontrolledValue(nextValue)
    }
    local.onInputValueChange?.(nextValue)
  }
  const gesture = useNumberInputGesture({
    getRange: getBounds,
    getStep: () => getStep(local.step),
    getValue: getCurrentValue,
    onValueChange: emitValue,
  })

  return (
    <div class={NUMBER_INPUT_CLASSES({class: local.class, size: getSize()})}>
      <button
        aria-label={local.decrementLabel ?? `Decrease ${local['aria-label']}`}
        class={cx(ARROW_CLASS, 'border-r border-solid border-border')}
        disabled={local.disabled}
        onClick={() => changeByStep(-1)}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-chevron-left size-4" />
      </button>
      <span class="relative min-w-0 flex-1">
        <input
          {...rest}
          aria-label={local['aria-label']}
          class={cx(
            INPUT_CLASS,
            INPUT_SIZE_CLASSES[getSize()],
            local.unit && 'pr-8',
            gesture.dragging() && 'select-none',
          )}
          disabled={local.disabled}
          max={local.max}
          min={local.min}
          onClick={gesture.handleClick}
          onInput={handleInput}
          onLostPointerCapture={gesture.handleLostPointerCapture}
          onPointerCancel={gesture.handlePointerCancel}
          onPointerDown={gesture.handlePointerDown}
          onPointerMove={gesture.handlePointerMove}
          onPointerUp={gesture.handlePointerUp}
          readOnly={
            local.readOnly ?? (local.value !== undefined && local.onInputValueChange === undefined)
          }
          step={local.step}
          type="number"
          value={local.value === undefined ? uncontrolledValue() : local.value}
        />
        <Show when={local.unit}>
          {(unit) => (
            <span aria-hidden="true" class={UNIT_CLASS}>
              {unit()}
            </span>
          )}
        </Show>
      </span>
      <button
        aria-label={local.incrementLabel ?? `Increase ${local['aria-label']}`}
        class={cx(ARROW_CLASS, 'border-l border-solid border-border')}
        disabled={local.disabled}
        onClick={() => changeByStep(1)}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-chevron-right size-4" />
      </button>
    </div>
  )
}
