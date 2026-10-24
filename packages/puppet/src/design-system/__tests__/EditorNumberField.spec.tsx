/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {EditorNumberField} from '../EditorNumberField'

describe('EditorNumberField', () => {
  test('should preserve transitional text while applying valid direct input', () => {
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorNumberField
        label="각도"
        maximum={180}
        minimum={-180}
        value={30.000_000_000_000_004}
        onValueChange={onValueChange}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '각도'})

    expect(input).toHaveValue(30)
    fireEvent.focus(input)
    fireEvent.input(input, {target: {value: ''}})
    expect(input).toHaveValue(null)
    expect(onValueChange).not.toHaveBeenCalled()

    fireEvent.input(input, {target: {value: '-'}})
    expect(input).toHaveValue(null)
    expect(onValueChange).not.toHaveBeenCalled()

    fireEvent.input(input, {target: {value: '-12.5'}})
    expect(onValueChange).toHaveBeenLastCalledWith(-12.5)
  })

  test('should show an external value change without replacing a focused input', () => {
    const [value, setValue] = createSignal(0)
    const view = render(() => (
      <EditorNumberField label="값" value={value()} onValueChange={setValue} />
    ))
    const input = view.getByRole('spinbutton', {name: '값'})

    input.focus()
    fireEvent.input(input, {target: {value: '60'}})
    expect(value()).toBe(60)
    setValue(30)

    expect(view.getByRole('spinbutton', {name: '값'})).toBe(input)
    expect(input).toHaveValue(30)
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, {key: 'Escape'})
    expect(value()).toBe(30)
  })

  test('should scrub horizontally, clamp the range, and group the edit lifecycle', () => {
    const onEditEnd = vi.fn()
    const onEditStart = vi.fn()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorNumberField
        label="불투명도"
        maximum={1}
        minimum={0}
        step={0.01}
        value={0.5}
        onEditEnd={onEditEnd}
        onEditStart={onEditStart}
        onValueChange={onValueChange}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '불투명도'})
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({width: 100, x: 0}))

    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 50}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 70}))
    expect(onEditStart).toHaveBeenCalledOnce()
    expect(onValueChange).toHaveBeenLastCalledWith(0.7)

    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 300}))
    expect(onValueChange).toHaveBeenLastCalledWith(1)
    fireEvent(globalThis.window, new MouseEvent('pointerup', {bubbles: true, clientX: 300}))
    expect(onEditEnd).toHaveBeenCalledOnce()
  })

  test('should keep bounded scrubbing precise in narrow fields', () => {
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorNumberField
        label="각도"
        maximum={30}
        minimum={-30}
        value={0}
        onValueChange={onValueChange}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '각도'})
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({width: 46, x: 100}))

    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 123}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 146}))
    expect(onValueChange).toHaveBeenLastCalledWith(30)

    fireEvent(globalThis.window, new MouseEvent('pointerup', {bubbles: true, clientX: 146}))
    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 123}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 100}))

    expect(onValueChange).toHaveBeenLastCalledWith(-30)
  })

  test('should use precision movement while Shift is held', () => {
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorNumberField label="X" step={1} value={10} onValueChange={onValueChange} />
    ))
    const input = view.getByRole('spinbutton', {name: 'X'})

    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
    fireEvent(
      globalThis.window,
      new MouseEvent('pointermove', {bubbles: true, clientX: 120, shiftKey: true}),
    )
    fireEvent(globalThis.window, new MouseEvent('pointerup', {bubbles: true, clientX: 120}))

    expect(onValueChange).toHaveBeenLastCalledWith(12)
  })

  test('should finish an active edit when the field unmounts during scrubbing', () => {
    const onEditEnd = vi.fn()
    const onEditStart = vi.fn()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorNumberField
        label="값"
        value={0}
        onEditEnd={onEditEnd}
        onEditStart={onEditStart}
        onValueChange={onValueChange}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '값'})

    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 120}))
    expect(onEditStart).toHaveBeenCalledOnce()

    view.unmount()

    expect(onEditEnd).toHaveBeenCalledOnce()
    const changeCount = onValueChange.mock.calls.length
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 140}))
    expect(onValueChange).toHaveBeenCalledTimes(changeCount)
  })

  test('should step with arrow buttons and respect the bounded range', () => {
    const [value, setValue] = createSignal(0.9)
    const onEditEnd = vi.fn()
    const onEditStart = vi.fn()
    const onValueChange = vi.fn(setValue)
    const view = render(() => (
      <EditorNumberField
        label="값"
        maximum={1}
        minimum={0}
        step={0.1}
        value={value()}
        onEditEnd={onEditEnd}
        onEditStart={onEditStart}
        onValueChange={onValueChange}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '값 증가'}))
    expect(onValueChange).toHaveBeenLastCalledWith(1)
    expect(view.getByRole('button', {name: '값 증가'})).toBeDisabled()
    fireEvent.click(view.getByRole('button', {name: '값 감소'}))
    expect(onValueChange).toHaveBeenLastCalledWith(0.9)
    expect(onEditStart).toHaveBeenCalledTimes(2)
    expect(onEditEnd).toHaveBeenCalledTimes(2)
  })

  test('should disable unavailable arrow directions', () => {
    const view = render(() => <EditorNumberField label="값" maximum={10} minimum={0} value={0} />)

    expect(view.getByRole('button', {name: '값 감소'})).toBeDisabled()
    expect(view.getByRole('button', {name: '값 증가'})).toBeDisabled()
  })

  test('should show bounded progress and restore the external value with Escape', () => {
    const [value, setValue] = createSignal(25)
    const view = render(() => (
      <EditorNumberField
        label="값"
        maximum={100}
        minimum={0}
        value={value()}
        onValueChange={setValue}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '값'})
    const field = input.closest('.editor-number-field')

    expect((field as HTMLElement).style.getPropertyValue('--number-field-progress')).toBe('25%')
    fireEvent.focus(input)
    fireEvent.input(input, {target: {value: '60'}})
    expect(value()).toBe(60)
    fireEvent.keyDown(input, {key: 'Escape'})

    expect(input).toHaveValue(25)
  })
})

test('should reserve focused pointer gestures for text selection', () => {
  const onValueChange = vi.fn()
  const view = render(() => (
    <EditorNumberField label="드래그" value={10} onValueChange={onValueChange} />
  ))
  const input = view.getByRole('spinbutton', {name: '드래그'})
  const down = new MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 100,
  })
  fireEvent(input, down)
  expect(down.defaultPrevented).toBe(true)
  fireEvent(globalThis.window, new MouseEvent('pointerup', {bubbles: true}))
  fireEvent.click(input)
  expect(input).toHaveFocus()
  const focused = new MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 100,
  })
  fireEvent(input, focused)
  expect(focused.defaultPrevented).toBe(false)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 130}))
  expect(onValueChange).not.toHaveBeenCalled()
})

test.each([10, 90])(
  'should map pointer position to the whole range regardless of the starting value (%s)',
  (start) => {
    const [value, setValue] = createSignal(start)
    const view = render(() => (
      <EditorNumberField
        label="값"
        minimum={0}
        maximum={100}
        value={value()}
        onValueChange={setValue}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '값'})
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 24))
    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: start}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 75}))
    expect(value()).toBe(75)
    fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 0, shiftKey: true}))
    expect(value()).toBe(0)
    fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 100, shiftKey: true}))
    expect(value()).toBe(100)
  },
)

test('should include the unit area in the supported range and exclude arrow buttons', () => {
  const [value, setValue] = createSignal(50)
  const view = render(() => (
    <EditorNumberField
      label="강도"
      minimum={0}
      maximum={100}
      unit="%"
      value={value()}
      onValueChange={setValue}
    />
  ))
  const input = view.getByRole('spinbutton', {name: '강도'})
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 100, 24))
  vi.spyOn(input.nextElementSibling!, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(200, 0, 20, 24),
  )
  fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 150}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 160}))
  expect(value()).toBe(50)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 220}))
  expect(value()).toBe(100)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 80}))
  expect(value()).toBe(0)
})

test('should switch Shift precision without jumping to a different value', () => {
  const [value, setValue] = createSignal(10)
  const view = render(() => (
    <EditorNumberField label="값" value={value()} onValueChange={setValue} />
  ))
  const input = view.getByRole('spinbutton', {name: '값'})
  fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 120}))
  expect(value()).toBe(30)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 121, shiftKey: true}))
  expect(value()).toBe(30.1)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 122}))
  expect(value()).toBe(31.1)
})

test('should ignore movement and release from another pointer', () => {
  const onValueChange = vi.fn()
  const view = render(() => (
    <EditorNumberField label="값" value={10} onValueChange={onValueChange} />
  ))
  const input = view.getByRole('spinbutton', {name: '값'})
  const dispatch = (target: Element | Window, type: string, pointerId: number, clientX: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX})
    Object.defineProperty(event, 'pointerId', {value: pointerId})
    fireEvent(target, event)
  }
  dispatch(input, 'pointerdown', 1, 100)
  dispatch(globalThis.window, 'pointermove', 2, 130)
  expect(onValueChange).not.toHaveBeenCalled()
  dispatch(globalThis.window, 'pointerup', 2, 130)
  dispatch(globalThis.window, 'pointermove', 1, 120)
  expect(onValueChange).toHaveBeenLastCalledWith(30)
})

test('should stop scrubbing when Escape cancels the gesture', () => {
  const [value, setValue] = createSignal(10)
  const view = render(() => (
    <EditorNumberField label="값" value={value()} onValueChange={setValue} />
  ))
  const input = view.getByRole('spinbutton', {name: '값'})
  fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 120}))
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(value()).toBe(10)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 140}))
  expect(value()).toBe(10)
})

test('should use the configured step for keyboard arrows and leave wheel scrolling unchanged', () => {
  const [value, setValue] = createSignal(0.5)
  const view = render(() => (
    <EditorNumberField
      label="값"
      minimum={0}
      maximum={1}
      step={0.1}
      value={value()}
      onValueChange={setValue}
    />
  ))
  const input = view.getByRole('spinbutton', {name: '값'})
  input.focus()
  fireEvent.keyDown(input, {key: 'ArrowUp'})
  expect(value()).toBe(0.6)
  fireEvent.keyDown(input, {key: 'ArrowDown'})
  expect(value()).toBe(0.5)
  const wheel = new WheelEvent('wheel', {bubbles: true, cancelable: true, deltaY: -10})
  fireEvent(input, wheel)
  expect(wheel.defaultPrevented).toBe(true)
  expect(input).toHaveValue(0.5)
  expect(value()).toBe(0.5)
})

test.each([49.8266384778, 0.123456789012345])(
  'should abbreviate display without committing rounding on focus and blur (value=%s)',
  (value) => {
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorNumberField
        label="값"
        value={value}
        maximumFractionDigits={2}
        onValueChange={onValueChange}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '값'})
    expect(input).toHaveValue(Number(value.toFixed(2)))
    input.focus()
    expect(input).toHaveValue(value)
    input.blur()
    expect(input).toHaveValue(Number(value.toFixed(2)))
    expect(onValueChange).not.toHaveBeenCalled()
  },
)

test('should retain external updates and end a drag rather than overwrite them', () => {
  const [value, setValue] = createSignal(10)
  const onEditEnd = vi.fn()
  const view = render(() => (
    <EditorNumberField label="값" value={value()} onValueChange={setValue} onEditEnd={onEditEnd} />
  ))
  const input = view.getByRole('spinbutton', {name: '값'})
  fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 120}))
  setValue(60)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 140}))
  expect(value()).toBe(60)
  expect(input).toHaveValue(60)
  expect(onEditEnd).toHaveBeenCalledOnce()
})

test.each(['blur', 'pointercancel'])(
  'should cancel a drag on %s and restore the starting value',
  (eventType) => {
    const [value, setValue] = createSignal(10)
    const onEditEnd = vi.fn()
    const view = render(() => (
      <EditorNumberField
        label="값"
        value={value()}
        onValueChange={setValue}
        onEditEnd={onEditEnd}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '값'})
    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 120}))
    fireEvent(globalThis.window, new MouseEvent(eventType))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 140}))
    expect(value()).toBe(10)
    expect(onEditEnd).toHaveBeenCalledOnce()
  },
)

test('should continue scrubbing when the owner returns a floating point round-trip', () => {
  const [value, setValue] = createSignal(0.5)
  const view = render(() => (
    <EditorNumberField
      label="불투명도"
      minimum={0}
      maximum={1}
      step={0.01}
      value={value()}
      onValueChange={(next) => setValue(next + Number.EPSILON)}
    />
  ))
  const input = view.getByRole('spinbutton', {name: '불투명도'})
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 24))
  fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 50}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 25}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 100}))
  expect(value()).toBeCloseTo(1, 12)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 0}))
  expect(value()).toBeCloseTo(0, 12)
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(value()).toBeCloseTo(0.5, 12)
})

test('should keep bounded integer scrubbing aligned to supported steps', () => {
  const [value, setValue] = createSignal(2)
  const view = render(() => (
    <EditorNumberField
      label="칸"
      minimum={1}
      maximum={16}
      step={1}
      value={value()}
      onValueChange={(next) => {
        if (Number.isInteger(next)) {
          setValue(next)
        }
      }}
    />
  ))
  const input = view.getByRole('spinbutton', {name: '칸'})
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 24))
  fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 25}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 50}))
  expect(value()).toBe(9)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 100}))
  expect(value()).toBe(16)
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 0}))
  expect(value()).toBe(1)
})

test('should ignore editing gestures inherited from a disabled fieldset', () => {
  const onValueChange = vi.fn()
  const onEditStart = vi.fn()
  const view = render(() => (
    <fieldset disabled>
      <EditorNumberField
        label="잠금"
        minimum={0.25}
        maximum={3}
        step={0.1}
        value={1}
        onValueChange={onValueChange}
        onEditStart={onEditStart}
      />
    </fieldset>
  ))
  const input = view.getByRole('spinbutton', {name: '잠금'})
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 24))
  fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 50}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 100}))
  fireEvent(globalThis.window, new MouseEvent('pointerup', {clientX: 100}))
  fireEvent.click(view.getByRole('button', {name: '잠금 증가'}))
  expect(input).toHaveValue(1)
  expect(onValueChange).not.toHaveBeenCalled()
  expect(onEditStart).not.toHaveBeenCalled()
})

test('should move focus within the field when Enter ends direct editing', () => {
  const [value, setValue] = createSignal(10)
  const view = render(() => (
    <EditorNumberField label="값" value={value()} onValueChange={setValue} />
  ))
  const input = view.getByRole('spinbutton', {name: '값'})
  input.focus()
  fireEvent.input(input, {target: {value: '20'}})
  fireEvent.keyDown(input, {key: 'Enter'})
  expect(input).not.toHaveFocus()
  expect(document.activeElement).toBe(input.parentElement)
  expect(value()).toBe(20)
})

test('should start a scrub from the unit area', () => {
  const [value, setValue] = createSignal(50)
  const view = render(() => (
    <EditorNumberField
      label="강도"
      minimum={0}
      maximum={100}
      unit="%"
      value={value()}
      onValueChange={setValue}
    />
  ))
  const input = view.getByRole('spinbutton', {name: '강도'})
  const unit = view.getByText('%')
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 80, 24))
  vi.spyOn(unit, 'getBoundingClientRect').mockReturnValue(new DOMRect(80, 0, 20, 24))
  fireEvent(unit, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 90}))
  fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 0}))
  fireEvent(globalThis.window, new MouseEvent('pointerup', {clientX: 0}))
  expect(value()).toBe(0)
})
