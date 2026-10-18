/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PNumberInput} from '../PNumberInput'

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
  }
}

const installPointerCapture = (element: HTMLElement) => {
  const hasPointerCapture = vi.fn(() => true)
  const releasePointerCapture = vi.fn()
  const setPointerCapture = vi.fn()

  Object.defineProperties(element, {
    hasPointerCapture: {configurable: true, value: hasPointerCapture},
    releasePointerCapture: {configurable: true, value: releasePointerCapture},
    setPointerCapture: {configurable: true, value: setPointerCapture},
  })

  return {hasPointerCapture, releasePointerCapture, setPointerCapture}
}

const installBounds = (element: HTMLElement, left: number, width: number) => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    bottom: 32,
    height: 32,
    left,
    right: left + width,
    toJSON: () => ({}),
    top: 0,
    width,
    x: left,
    y: 0,
  })
}

interface RenderOptions {
  readonly disabled?: boolean
  readonly max?: number
  readonly min?: number
  readonly readOnly?: boolean
  readonly size?: 'medium' | 'small'
  readonly step?: number
  readonly type?: 'number' | 'text'
  readonly value?: string
}

const renderNumberInput = (options: RenderOptions = {}) => {
  const [value, setValue] = createSignal(options.value ?? '5')
  const onInputValueChange = vi.fn((nextValue: string) => setValue(nextValue))
  const onValueChange = vi.fn((nextValue: number) => setValue(String(nextValue)))

  render(() => (
    <PNumberInput
      aria-label="Duration"
      decrementLabel="Decrease Duration"
      disabled={options.disabled}
      incrementLabel="Increase Duration"
      max={options.max}
      min={options.min}
      onInputValueChange={onInputValueChange}
      onValueChange={onValueChange}
      readOnly={options.readOnly}
      size={options.size}
      step={options.step}
      type={options.type}
      value={value()}
    />
  ))

  return {
    input: screen.getByRole('spinbutton', {name: 'Duration'}),
    onInputValueChange,
    onValueChange,
  }
}

describe('PNumberInput', () => {
  beforeEach(() => vi.stubGlobal('PointerEvent', TestPointerEvent))

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('should change by one step with the side arrow buttons', () => {
    const {input, onValueChange} = renderNumberInput({max: 10, min: 1, value: '5'})

    fireEvent.click(screen.getByRole('button', {name: 'Decrease Duration'}))
    fireEvent.click(screen.getByRole('button', {name: 'Increase Duration'}))

    expect(onValueChange).toHaveBeenNthCalledWith(1, 4)
    expect(onValueChange).toHaveBeenNthCalledWith(2, 5)
    expect(input).toHaveValue(5)
  })

  it('should increment from the last value after the input is cleared', () => {
    const {input, onValueChange} = renderNumberInput({max: 10, min: 1, value: '5'})

    fireEvent.input(input, {target: {value: ''}})
    fireEvent.click(screen.getByRole('button', {name: 'Increase Duration'}))

    expect(onValueChange).toHaveBeenCalledWith(6)
    expect(input).toHaveValue(6)
  })

  it('should increment from the latest edited value after the input is cleared', () => {
    const {input, onValueChange} = renderNumberInput({max: 10, min: 1, value: '5'})

    fireEvent.input(input, {target: {value: '7'}})
    fireEvent.input(input, {target: {value: ''}})
    fireEvent.click(screen.getByRole('button', {name: 'Increase Duration'}))

    expect(onValueChange).toHaveBeenCalledWith(8)
    expect(input).toHaveValue(8)
  })

  it('should forward raw text while the center field is edited', () => {
    const {input, onInputValueChange} = renderNumberInput({max: 10, min: 1, value: '5'})

    fireEvent.input(input, {target: {value: '7'}})

    expect(onInputValueChange).toHaveBeenCalledWith('7')
    expect(input).toHaveValue(7)
  })

  it('should keep text mode as a bounded spinbutton with native number stepping', async () => {
    const user = userEvent.setup()
    const {input, onInputValueChange, onValueChange} = renderNumberInput({
      max: 100,
      min: 1,
      type: 'text',
    })

    expect(input).toHaveProperty('type', 'text')
    expect(input).toHaveAttribute('aria-valuemin', '1')
    expect(input).toHaveAttribute('aria-valuemax', '100')
    expect(input).toHaveAttribute('aria-valuenow', '5')

    fireEvent.keyDown(input, {key: 'ArrowUp'})
    expect(onValueChange).toHaveBeenNthCalledWith(1, 6)
    fireEvent.keyDown(input, {key: 'ArrowDown'})
    expect(onValueChange).toHaveBeenNthCalledWith(2, 5)

    await user.clear(input)
    await user.paste('３０')
    expect(input).toHaveValue('３０')
    expect(onInputValueChange).toHaveBeenLastCalledWith('３０')
    expect(input).toHaveAttribute('aria-valuenow', '30')
    fireEvent.click(screen.getByRole('button', {name: 'Increase Duration'}))

    expect(onValueChange).toHaveBeenLastCalledWith(31)
    expect(input).toHaveProperty('value', '31')
  })

  it('should preserve caller-provided role and value attributes in native number mode', () => {
    render(() => (
      <PNumberInput
        aria-label="Custom duration"
        aria-valuemax="60"
        aria-valuemin="1"
        aria-valuenow="30"
        readOnly
        role="slider"
        value="30"
      />
    ))

    const input = screen.getByRole('slider', {name: 'Custom duration'})

    expect(input).toHaveProperty('type', 'number')
    expect(input).toHaveAttribute('aria-valuemin', '1')
    expect(input).toHaveAttribute('aria-valuemax', '60')
    expect(input).toHaveAttribute('aria-valuenow', '30')
  })

  it('should not step a read-only text spinbutton like a native number input', () => {
    const [textValue, setTextValue] = createSignal('5')
    const [numberValue, setNumberValue] = createSignal('5')
    const [inferredValue, setInferredValue] = createSignal('5')
    const onTextValueChange = vi.fn((value: number) => setTextValue(String(value)))
    const onNumberValueChange = vi.fn((value: number) => setNumberValue(String(value)))
    const onInferredValueChange = vi.fn((value: number) => setInferredValue(String(value)))

    render(() => (
      <>
        <PNumberInput
          aria-label="Read-only text duration"
          onValueChange={onTextValueChange}
          readOnly
          type="text"
          value={textValue()}
        />
        <PNumberInput
          aria-label="Read-only number duration"
          onValueChange={onNumberValueChange}
          readOnly
          value={numberValue()}
        />
        <PNumberInput
          aria-label="Inferred read-only text duration"
          onValueChange={onInferredValueChange}
          type="text"
          value={inferredValue()}
        />
      </>
    ))

    const textInput = screen.getByRole('spinbutton', {name: 'Read-only text duration'})
    const numberInput = screen.getByRole('spinbutton', {name: 'Read-only number duration'})
    const inferredInput = screen.getByRole('spinbutton', {name: 'Inferred read-only text duration'})

    expect(textInput).toHaveProperty('readOnly', true)
    expect(numberInput).toHaveProperty('readOnly', true)
    expect(inferredInput).toHaveProperty('readOnly', true)

    textInput.focus()
    fireEvent.keyDown(textInput, {key: 'ArrowUp'})
    numberInput.focus()
    fireEvent.keyDown(numberInput, {key: 'ArrowUp'})
    inferredInput.focus()
    fireEvent.keyDown(inferredInput, {key: 'ArrowUp'})

    expect(onNumberValueChange).not.toHaveBeenCalled()
    expect(numberInput).toHaveValue(5)
    expect(onTextValueChange).not.toHaveBeenCalled()
    expect(textInput).toHaveValue('5')
    expect(onInferredValueChange).not.toHaveBeenCalled()
    expect(inferredInput).toHaveValue('5')
  })

  it('should apply the text spinbutton step and bounds only for unmodified arrows', () => {
    const {input, onValueChange} = renderNumberInput({
      max: 6,
      min: 0,
      step: 2,
      type: 'text',
      value: '4',
    })

    fireEvent.keyDown(input, {altKey: true, key: 'ArrowUp'})
    fireEvent.keyDown(input, {ctrlKey: true, key: 'ArrowUp'})
    fireEvent.keyDown(input, {key: 'ArrowUp', metaKey: true})
    fireEvent.keyDown(input, {key: 'ArrowUp', shiftKey: true})
    expect(onValueChange).not.toHaveBeenCalled()

    fireEvent.keyDown(input, {key: 'ArrowUp'})
    fireEvent.keyDown(input, {key: 'ArrowUp'})
    fireEvent.keyDown(input, {key: 'ArrowDown'})
    fireEvent.keyDown(input, {key: 'ArrowDown'})
    fireEvent.keyDown(input, {key: 'ArrowDown'})
    fireEvent.keyDown(input, {key: 'ArrowDown'})

    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([6, 6, 4, 2, 0, 0])
    expect(input).toHaveValue('0')
  })

  it('should forward keydown and honor a caller-prevented default before text stepping', () => {
    const [value, setValue] = createSignal('5')
    const onKeyDown = vi.fn((event: Event) => event.preventDefault())
    const onInputValueChange = vi.fn((nextValue: string) => setValue(nextValue))
    const onValueChange = vi.fn((nextValue: number) => setValue(String(nextValue)))

    render(() => (
      <PNumberInput
        aria-label="Duration"
        onKeyDown={onKeyDown}
        onInputValueChange={onInputValueChange}
        onValueChange={onValueChange}
        readOnly={false}
        type="text"
        value={value()}
      />
    ))

    const input = screen.getByRole('spinbutton', {name: 'Duration'})
    expect(input).toHaveProperty('readOnly', false)
    fireEvent.keyDown(input, {key: 'ArrowUp'})

    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(onKeyDown.mock.calls[0]?.[0]?.defaultPrevented).toBe(true)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(input).toHaveValue('5')
  })

  it('should forward a native number keydown handler without preventing default', () => {
    const onKeyDown = vi.fn()

    render(() => (
      <PNumberInput aria-label="Native duration" onKeyDown={onKeyDown} readOnly value="5" />
    ))

    const input = screen.getByRole('spinbutton', {name: 'Native duration'})
    const event = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'ArrowUp'})
    input.dispatchEvent(event)

    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(onKeyDown).toHaveBeenCalledWith(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('should not step a disabled text spinbutton from a dispatched keydown', () => {
    const {input, onValueChange} = renderNumberInput({
      disabled: true,
      max: 10,
      min: 1,
      type: 'text',
      value: '5',
    })

    fireEvent.keyDown(input, {key: 'ArrowUp'})

    expect(onValueChange).not.toHaveBeenCalled()
    expect(input).toHaveValue('5')
  })

  it('should map a bounded horizontal drag to the field range', () => {
    const {input, onValueChange} = renderNumberInput({max: 100, min: 0, step: 10, value: '50'})
    const pointerCapture = installPointerCapture(input)
    installBounds(input, 100, 200)

    fireEvent.pointerDown(input, {button: 0, clientX: 140, clientY: 16, pointerId: 1})
    fireEvent.pointerMove(input, {clientX: 100, clientY: 16, pointerId: 1})
    expect(input).toHaveClass('select-none')
    fireEvent.pointerMove(input, {clientX: 300, clientY: 16, pointerId: 1})
    fireEvent.pointerUp(input, {clientX: 300, clientY: 16, pointerId: 1})

    expect(onValueChange).toHaveBeenNthCalledWith(1, 0)
    expect(onValueChange).toHaveBeenNthCalledWith(2, 100)
    expect(pointerCapture.setPointerCapture).toHaveBeenCalledWith(1)
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledWith(1)
    expect(input).not.toHaveClass('select-none')
  })

  it('should use the same small and medium height tokens as buttons', () => {
    const small = renderNumberInput({size: 'small'})

    expect(small.input).toHaveClass('h-auto', 'py-2')
    expect(small.input.parentElement?.parentElement).toHaveClass('min-h-control-sm')
    cleanup()

    const medium = renderNumberInput({size: 'medium'})

    expect(medium.input).toHaveClass('h-auto', 'py-3')
    expect(medium.input.parentElement?.parentElement).toHaveClass('min-h-control-md')
  })

  it('should use relative dragging when no range is provided', () => {
    const {input, onValueChange} = renderNumberInput({step: 2, value: '10'})
    installPointerCapture(input)

    fireEvent.pointerDown(input, {button: 0, clientX: 100, clientY: 16, pointerId: 1})
    fireEvent.pointerMove(input, {clientX: 116, clientY: 16, pointerId: 1})
    fireEvent.pointerUp(input, {clientX: 116, clientY: 16, pointerId: 1})

    expect(onValueChange).toHaveBeenCalledWith(14)
  })

  it('should keep a click available for direct text editing', () => {
    const {input, onValueChange} = renderNumberInput({max: 10, min: 1, value: '5'})

    input.focus()
    fireEvent.click(input)

    expect(input).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
