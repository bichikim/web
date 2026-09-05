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
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({width: 100}))

    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 120}))
    expect(onEditStart).toHaveBeenCalledOnce()
    expect(onValueChange).toHaveBeenLastCalledWith(0.7)

    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 300}))
    expect(onValueChange).toHaveBeenLastCalledWith(1)
    fireEvent(window, new MouseEvent('pointerup', {bubbles: true, clientX: 300}))
    expect(onEditEnd).toHaveBeenCalledOnce()
  })

  test('should use precision movement while Shift is held', () => {
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorNumberField label="X" step={1} value={10} onValueChange={onValueChange} />
    ))
    const input = view.getByRole('spinbutton', {name: 'X'})

    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 120, shiftKey: true}))
    fireEvent(window, new MouseEvent('pointerup', {bubbles: true, clientX: 120}))

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
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 120}))
    expect(onEditStart).toHaveBeenCalledOnce()

    view.unmount()

    expect(onEditEnd).toHaveBeenCalledOnce()
    const changeCount = onValueChange.mock.calls.length
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 140}))
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
