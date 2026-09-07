import {NumberField} from '@kobalte/core/number-field'
import {Button} from '@kobalte/core/button'
import {clamp} from 'es-toolkit/math'
import {createSignal, onCleanup, Show} from 'solid-js'

const DEFAULT_STEP = 1
const DRAG_THRESHOLD = 3
const PRECISION_MULTIPLIER = 0.1
const FALLBACK_SCRUB_DISTANCE = 200
const SIGNIFICANT_DIGITS = 12
const WHOLE_PERCENT = 100

export interface EditorNumberFieldProps {
  readonly describedBy?: string
  readonly disabled?: boolean
  readonly label: string
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

const formatValue = (value: number | undefined) =>
  value === undefined ? '' : String(roundValue(value))

interface StartScrubOptions {
  readonly event: PointerEvent
  readonly maximum?: number
  readonly minimum?: number
  readonly onBegin: () => void
  readonly onCancel: () => void
  readonly onChange: (value: number) => void
  readonly onFinish: () => void
  readonly startValue: number
  readonly step: number
}

const startScrub = (options: StartScrubOptions) => {
  const startPointerX = options.event.clientX
  let moved = false
  const remove = () => {
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', finish)
  }
  const move = (event: PointerEvent) => {
    const pointerDistance = event.clientX - startPointerX
    if (!moved && Math.abs(pointerDistance) < DRAG_THRESHOLD) {
      return
    }

    if (!moved) {
      moved = true
      options.onBegin()
    }
    event.preventDefault()
    const precision = event.shiftKey ? PRECISION_MULTIPLIER : 1
    options.onChange(
      constrainValue(
        roundValue(options.startValue + pointerDistance * options.step * precision),
        options.minimum,
        options.maximum,
      ),
    )
  }
  const finish = () => {
    remove()
    if (moved) {
      options.onFinish()
    }
  }
  const cancel = () => {
    remove()
    if (moved) {
      options.onCancel()
    }
  }

  window.addEventListener('pointercancel', cancel)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', finish)
  return remove
}

// eslint-disable-next-line max-lines-per-function
export const EditorNumberField = (props: EditorNumberFieldProps) => {
  const [draft, setDraft] = createSignal<string | null>(null)
  const [input, setInput] = createSignal<HTMLInputElement | undefined>()
  const [scrubbing, setScrubbing] = createSignal(false)
  let editActive = false
  let editStartValue = 0
  let ignoreNextClick = false
  let lastEmittedValue: number | null = null
  let removeGestureListeners: (() => void) | undefined

  const isBounded = () =>
    props.minimum !== undefined && props.maximum !== undefined && props.maximum > props.minimum
  const displayedValue = () => draft() ?? formatValue(props.value)
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
  const scrubStep = (distance: number) => {
    if (isBounded()) {
      return (props.maximum! - props.minimum!) / distance
    }
    return typeof props.step === 'number' ? props.step : DEFAULT_STEP
  }
  const arrowStep = () => (typeof props.step === 'number' ? props.step : DEFAULT_STEP)
  const canDecrease = () =>
    props.disabled !== true &&
    props.onValueChange !== undefined &&
    (props.minimum === undefined || (props.value ?? 0) > props.minimum)
  const canIncrease = () =>
    props.disabled !== true &&
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
    lastEmittedValue = props.value ?? null
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
    if (editActive && lastEmittedValue !== editStartValue) {
      props.onValueChange?.(editStartValue)
    }
    lastEmittedValue = editStartValue
    setDraft(null)
    setScrubbing(false)
    endEdit()
  }
  const handleStep = (direction: -1 | 1) => {
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
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || props.disabled === true || props.onValueChange === undefined) {
      return
    }

    const inputWidth = input()?.getBoundingClientRect().width ?? 0
    const scrubDistance = inputWidth > 0 ? inputWidth : FALLBACK_SCRUB_DISTANCE
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
      startValue: props.value ?? 0,
      step: scrubStep(scrubDistance),
    })
  }

  onCleanup(() => {
    removeGestureListeners?.()
    endEdit()
  })

  return (
    <NumberField
      as="span"
      value={displayedValue()}
      format={false}
      minValue={props.minimum}
      maxValue={props.maximum}
      disabled={props.disabled}
      required={props.required}
      name={props.name}
      onChange={setDraft}
      classList={{'editor-number-field': true, scrubbing: scrubbing()}}
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
        onClick={(event: MouseEvent) => {
          if (ignoreNextClick) {
            event.preventDefault()
            ignoreNextClick = false
            input()?.blur()
          }
        }}
        onFocus={() => {
          beginEdit()
          setDraft(formatValue(props.value))
        }}
        onInput={(event) => {
          const {value} = event.currentTarget
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
          if (event.key === 'Enter') {
            event.preventDefault()
            commitDraft()
            input()?.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            cancelEdit()
            input()?.blur()
          }
        }}
        onPointerDown={handlePointerDown}
      />
      <Show when={props.unit}>{(unit) => <span aria-hidden="true">{unit()}</span>}</Show>
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
