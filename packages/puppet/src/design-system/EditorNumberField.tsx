import type {ControlSizeProps} from './control-size'
import {NumberField} from '@kobalte/core/number-field'
import {Button} from '@kobalte/core/button'
import {clamp} from 'es-toolkit/math'
import {createEffect, createSignal, on, onCleanup, Show} from 'solid-js'

const DEFAULT_STEP = 1
const DISPLAY_FRACTION_DIGITS = 4
const DRAG_THRESHOLD = 3
const PRECISION_MULTIPLIER = 0.1
const SIGNIFICANT_DIGITS = 12
const VALUE_TOLERANCE = 1e-12
const WHOLE_PERCENT = 100

export interface EditorNumberFieldProps extends ControlSizeProps {
  readonly describedBy?: string
  readonly disabled?: boolean
  readonly label: string
  readonly maximumFractionDigits?: number
  readonly maximum?: number
  readonly minimum?: number
  readonly name?: string
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onValueChange?: (value: number) => void
  readonly required?: boolean
  readonly step?: number | 'any'
  readonly unit?: string
  readonly value?: number
}

const constrainValue = (value: number, minimum: number | undefined, maximum: number | undefined) =>
  clamp(value, minimum ?? Number.NEGATIVE_INFINITY, maximum ?? Number.POSITIVE_INFINITY)

const roundValue = (value: number) => Number(value.toPrecision(SIGNIFICANT_DIGITS))

const sameValue = (value: number | undefined, emitted: number | null) =>
  value === emitted ||
  (value !== undefined &&
    emitted !== null &&
    Math.abs(value - emitted) <= Math.max(1, Math.abs(value), Math.abs(emitted)) * VALUE_TOLERANCE)

const formatValue = (value: number | undefined, maximumFractionDigits?: number) => {
  if (value === undefined) {
    return ''
  }
  const rounded = roundValue(value)
  return maximumFractionDigits === undefined
    ? String(value)
    : String(Number(rounded.toFixed(maximumFractionDigits)))
}

interface ScrubRange {
  readonly left: number
  readonly maximum: number
  readonly minimum: number
  readonly step?: number
  readonly width: number
}

interface StartScrubOptions {
  readonly event: PointerEvent
  readonly maximum?: number
  readonly minimum?: number
  readonly onBegin: () => void
  readonly onCancel: () => void
  readonly onChange: (value: number) => void
  readonly onFinish: () => void
  readonly range?: ScrubRange
  readonly startValue: number
  readonly step: number
}

const startScrub = (options: StartScrubOptions) => {
  const startPointerX = options.event.clientX
  const {pointerId} = options.event
  const target = options.event.currentTarget
  let previousX = startPointerX
  let currentValue = constrainValue(options.startValue, options.minimum, options.maximum)
  let moved = false
  const remove = () => {
    globalThis.removeEventListener('pointercancel', handlePointerCancel)
    globalThis.removeEventListener('pointermove', move)
    globalThis.removeEventListener('pointerup', finish)
    globalThis.removeEventListener('keydown', handleKeyDown)
    globalThis.removeEventListener('blur', cancel)
    if (
      target instanceof Element &&
      typeof pointerId === 'number' &&
      target.hasPointerCapture?.(pointerId)
    ) {
      target.releasePointerCapture(pointerId)
    }
  }
  const move = (event: PointerEvent) => {
    if (
      event.pointerId !== pointerId ||
      (!moved && Math.abs(event.clientX - startPointerX) < DRAG_THRESHOLD)
    ) {
      return
    }
    if (!moved) {
      moved = true
      if (target instanceof Element && typeof pointerId === 'number') {
        target.setPointerCapture?.(pointerId)
      }
      options.onBegin()
    }
    event.preventDefault()
    const precision = event.shiftKey ? PRECISION_MULTIPLIER : 1
    const delta = (event.clientX - previousX) * options.step * precision
    previousX = event.clientX
    const {range} = options
    const nextValue =
      range === undefined
        ? currentValue + delta
        : range.minimum +
          (range.maximum - range.minimum) * clamp((event.clientX - range.left) / range.width, 0, 1)
    const steppedValue =
      range?.step === undefined || nextValue === range.minimum || nextValue === range.maximum
        ? nextValue
        : range.minimum + Math.round((nextValue - range.minimum) / range.step) * range.step
    currentValue = constrainValue(roundValue(steppedValue), options.minimum, options.maximum)
    options.onChange(currentValue)
  }
  const finish = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return
    }
    remove()
    if (moved) {
      options.onFinish()
    }
  }
  const cancel = () => {
    remove()
    if (moved) {
      moved = false
      options.onCancel()
    }
  }
  const handlePointerCancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) {
      cancel()
    }
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  globalThis.addEventListener('pointercancel', handlePointerCancel)
  globalThis.addEventListener('pointermove', move)
  globalThis.addEventListener('pointerup', finish)
  globalThis.addEventListener('keydown', handleKeyDown)
  globalThis.addEventListener('blur', cancel)
  return remove
}

// eslint-disable-next-line max-lines-per-function
export const EditorNumberField = (props: EditorNumberFieldProps) => {
  const [draft, setDraft] = createSignal<string | null>(null)
  const [input, setInput] = createSignal<HTMLInputElement | undefined>()
  const [scrubbing, setScrubbing] = createSignal(false)
  let field: HTMLSpanElement | undefined
  let editActive = false
  let editStartValue = 0
  let ignoreNextClick = false
  let lastEmittedValue: number | null = null
  let removeGestureListeners: (() => void) | undefined

  createEffect(
    on(
      () => props.value,
      (value) => {
        if (!sameValue(value, lastEmittedValue)) {
          if (scrubbing()) {
            removeGestureListeners?.()
            removeGestureListeners = undefined
            setScrubbing(false)
            endEdit()
          }
          setDraft(null)
          editStartValue = value ?? 0
          lastEmittedValue = value ?? null
        }
      },
    ),
  )

  const isBounded = () =>
    props.minimum !== undefined && props.maximum !== undefined && props.maximum > props.minimum
  const displayedValue = () => {
    const pending = draft()
    const digits = props.maximumFractionDigits ?? DISPLAY_FRACTION_DIGITS
    return scrubbing()
      ? formatValue(pending === null ? props.value : Number(pending), digits)
      : (pending ?? formatValue(props.value, digits))
  }
  const progress = () => {
    if (!isBounded()) {
      return 0
    }

    const minimum = props.minimum!
    const maximum = props.maximum!
    const value = Number(draft() ?? props.value)
    const normalizedValue = Number.isFinite(value)
      ? constrainValue(value, minimum, maximum)
      : minimum
    return ((normalizedValue - minimum) / (maximum - minimum)) * WHOLE_PERCENT
  }
  const arrowStep = () => (typeof props.step === 'number' ? props.step : DEFAULT_STEP)
  const isDisabled = () => props.disabled === true || input()?.matches(':disabled') === true
  const canDecrease = () =>
    !isDisabled() &&
    props.onValueChange !== undefined &&
    (props.minimum === undefined || (props.value ?? 0) > props.minimum)
  const canIncrease = () =>
    !isDisabled() &&
    props.onValueChange !== undefined &&
    (props.maximum === undefined || (props.value ?? 0) < props.maximum)
  const emitValue = (value: number) => {
    if (value !== lastEmittedValue) {
      lastEmittedValue = value
      props.onValueChange?.(value)
    }
  }
  const beginEdit = () => {
    if (editActive) {
      return
    }

    editActive = true
    editStartValue = props.value ?? 0
    lastEmittedValue = props.value ?? 0
    props.onEditStart?.()
  }
  const endEdit = () => {
    if (!editActive) {
      return
    }

    editActive = false
    props.onEditEnd?.()
  }
  const commitDraft = () => {
    const value = Number(draft())
    if (draft() !== null && draft() !== '' && Number.isFinite(value)) {
      emitValue(constrainValue(value, props.minimum, props.maximum))
    }
    setDraft(null)
    endEdit()
  }
  const cancelEdit = () => {
    removeGestureListeners?.()
    removeGestureListeners = undefined
    if (editActive && lastEmittedValue !== editStartValue) {
      props.onValueChange?.(editStartValue)
    }
    lastEmittedValue = editStartValue
    setDraft(null)
    setScrubbing(false)
    endEdit()
  }
  const handleStep = (direction: -1 | 1) => {
    if (isDisabled() || props.onValueChange === undefined) {
      return
    }
    beginEdit()
    emitValue(
      constrainValue(
        roundValue((props.value ?? 0) + arrowStep() * direction),
        props.minimum,
        props.maximum,
      ),
    )
    endEdit()
  }
  const handleKeyboardStep = (direction: -1 | 1) => {
    if (isDisabled() || props.onValueChange === undefined) {
      return
    }
    const pending = Number(draft() ?? props.value ?? 0)
    const currentValue = Number.isFinite(pending) ? pending : (props.value ?? 0)
    const nextValue = constrainValue(
      roundValue(currentValue + arrowStep() * direction),
      props.minimum,
      props.maximum,
    )
    beginEdit()
    setDraft(formatValue(nextValue))
    emitValue(nextValue)
  }
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || isDisabled() || props.onValueChange === undefined) {
      return
    }

    if (document.activeElement === input()) {
      return
    }
    event.preventDefault()
    ignoreNextClick = false
    const element = input()
    const inputBounds = element?.getBoundingClientRect()
    const unitBounds =
      element?.nextElementSibling instanceof HTMLSpanElement
        ? element.nextElementSibling.getBoundingClientRect()
        : undefined
    const width =
      inputBounds === undefined ? 0 : (unitBounds?.right ?? inputBounds.right) - inputBounds.left
    const range =
      isBounded() && inputBounds !== undefined && width > 0
        ? {
            left: inputBounds.left,
            maximum: props.maximum!,
            minimum: props.minimum!,
            step: typeof props.step === 'number' && props.step > 0 ? props.step : undefined,
            width,
          }
        : undefined
    removeGestureListeners?.()
    removeGestureListeners = startScrub({
      event,
      maximum: props.maximum,
      minimum: props.minimum,
      onBegin() {
        beginEdit()
        setScrubbing(true)
      },
      onCancel() {
        cancelEdit()
        input()?.blur()
      },
      onChange(nextValue) {
        if (isDisabled() || props.onValueChange === undefined) {
          cancelEdit()
          return
        }
        setDraft(String(nextValue))
        emitValue(nextValue)
      },
      onFinish() {
        ignoreNextClick = true
        setDraft(null)
        setScrubbing(false)
        endEdit()
        input()?.blur()
      },
      range,
      startValue: props.value ?? 0,
      step: arrowStep(),
    })
  }

  const handleDraftChange = (value: string) => {
    if (isDisabled()) {
      return
    }
    setDraft(value)
    const number = Number(value)
    if (
      value !== '' &&
      Number.isFinite(number) &&
      number === constrainValue(number, props.minimum, props.maximum)
    ) {
      beginEdit()
      emitValue(number)
    }
  }

  const handleClick = (event: MouseEvent) => {
    if (isDisabled()) {
      return
    }
    if (ignoreNextClick) {
      event.preventDefault()
      ignoreNextClick = false
      input()?.blur()
    } else {
      input()?.focus()
    }
  }

  onCleanup(() => {
    removeGestureListeners?.()
    endEdit()
  })

  return (
    <NumberField
      as="span"
      ref={(element) => {
        field = element
      }}
      tabIndex={-1}
      value={displayedValue()}
      format={false}
      minValue={props.minimum}
      maxValue={props.maximum}
      disabled={props.disabled}
      required={props.required}
      name={props.name}
      onChange={handleDraftChange}
      step={arrowStep()}
      changeOnWheel={false}
      data-control-size={props.size ?? 'sm'}
      classList={{'editor-control': true, 'editor-number-field': true, scrubbing: scrubbing()}}
      data-bounded={isBounded() ? '' : undefined}
      style={{'--number-field-progress': `${progress()}%`}}
    >
      <Button
        aria-label={`${props.label} 감소`}
        class="editor-number-step decrement"
        disabled={!canDecrease()}
        type="button"
        onClick={() => handleStep(-1)}
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-chevron-left" />
      </Button>
      <NumberField.Input
        ref={setInput}
        aria-describedby={props.describedBy}
        aria-label={props.label}
        disabled={props.disabled}
        max={props.maximum}
        min={props.minimum}
        name={props.name}
        required={props.required}
        step={props.step ?? 'any'}
        type="number"
        value={displayedValue()}
        onBlur={commitDraft}
        onClick={handleClick}
        onFocus={() => {
          beginEdit()
          setDraft(formatValue(props.value))
        }}
        onInput={(event) => {
          if (isDisabled()) {
            return
          }
          const {value} = event.currentTarget
          beginEdit()
          setDraft(value)
          if (
            value !== '' &&
            Number.isFinite(event.currentTarget.valueAsNumber) &&
            event.currentTarget.validity.rangeOverflow === false &&
            event.currentTarget.validity.rangeUnderflow === false
          ) {
            emitValue(event.currentTarget.valueAsNumber)
          }
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault()
            handleKeyboardStep(event.key === 'ArrowUp' ? 1 : -1)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            commitDraft()
            field?.focus()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            cancelEdit()
            input()?.blur()
          } else {
            input()?.focus()
          }
        }}
        onWheel={(event: WheelEvent) => {
          if (document.activeElement === input()) {
            event.preventDefault()
          }
        }}
        onPointerDown={handlePointerDown}
      />
      <Show when={props.unit}>
        {(unit) => (
          <span aria-hidden="true" onClick={handleClick} onPointerDown={handlePointerDown}>
            {unit()}
          </span>
        )}
      </Show>
      <Button
        aria-label={`${props.label} 증가`}
        class="editor-number-step increment"
        disabled={!canIncrease()}
        type="button"
        onClick={() => handleStep(1)}
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-chevron-right" />
      </Button>
    </NumberField>
  )
}
