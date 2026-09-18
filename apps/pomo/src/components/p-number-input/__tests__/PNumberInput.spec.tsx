/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
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
  readonly max?: number
  readonly min?: number
  readonly size?: 'medium' | 'small'
  readonly step?: number
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
      incrementLabel="Increase Duration"
      max={options.max}
      min={options.min}
      onInputValueChange={onInputValueChange}
      onValueChange={onValueChange}
      size={options.size}
      step={options.step}
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

  it('should forward raw text while the center field is edited', () => {
    const {input, onInputValueChange} = renderNumberInput({max: 10, min: 1, value: '5'})

    fireEvent.input(input, {target: {value: '7'}})

    expect(onInputValueChange).toHaveBeenCalledWith('7')
    expect(input).toHaveValue(7)
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
