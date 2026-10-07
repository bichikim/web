/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorKeyformTrack} from '../EditorKeyformTrack'

const renderTrack = () => {
  const document = createDemoDocument()
  const onKeyformDelete = vi.fn()
  const onValueChange = vi.fn()
  const view = render(() => (
    <>
      <EditorKeyformTrack
        active={true}
        binding={document.parameterBindings![0]!}
        parameters={document.parameters!}
        values={[30, 30]}
        onKeyformAdd={vi.fn()}
        onKeyformDelete={onKeyformDelete}
        onValueChange={onValueChange}
      />
      <input aria-label="외부 입력" />
    </>
  ))
  return {onKeyformDelete, onValueChange, view}
}

test('should preserve focus on an outside input when dismissing the keyform menu', async () => {
  const {view} = renderTrack()
  vi.useFakeTimers()
  try {
    fireEvent.contextMenu(view.getByRole('button', {name: '키폼 선택: 30, 30'}))
    await vi.runAllTimersAsync()
    const menu = screen.getByRole('menu', {name: '키폼 작업'})
    const input = view.getByRole('textbox', {name: '외부 입력'})
    fireEvent.pointerDown(input)
    input.focus()
    fireEvent.pointerUp(input)
    fireEvent.click(input)
    expect(menu).toHaveAttribute('data-closed')
    // jsdom has no editor stylesheet; finish the primitive's pending exit animation explicitly.
    const animationEnd = new Event('animationend', {bubbles: true})
    Object.defineProperty(animationEnd, 'animationName', {value: ''})
    menu.dispatchEvent(animationEnd)
    await vi.runAllTimersAsync()
    expect(menu).not.toBeInTheDocument()
    expect(input).toHaveFocus()
  } finally {
    vi.useRealTimers()
  }
})

test('should target the long-pressed keyform when opening a touch context menu', async () => {
  const {view, onValueChange, onKeyformDelete} = renderTrack()
  const marker = view.getByRole('button', {name: '키폼 선택: 30, 30'})
  vi.useFakeTimers()
  try {
    const event = new MouseEvent('pointerdown', {bubbles: true, button: 0})
    Object.defineProperty(event, 'pointerType', {value: 'touch'})
    marker.dispatchEvent(event)
    await vi.advanceTimersByTimeAsync(700)
    const action = screen.getByRole('menuitem', {name: '키폼 삭제'})
    expect(action).not.toHaveAttribute('data-disabled')
    fireEvent.keyDown(action, {key: 'Enter'})
    expect(onValueChange).toHaveBeenLastCalledWith([30, 30])
    expect(onKeyformDelete).toHaveBeenCalledOnce()
  } finally {
    vi.useRealTimers()
  }
})

test('should use the current values for a context request outside the track surface', async () => {
  const {view, onValueChange, onKeyformDelete} = renderTrack()
  const track = view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')
  fireEvent.contextMenu(track.parentElement!)
  await screen.findByRole('menu', {name: '키폼 작업'})
  const action = screen.getByRole('menuitem', {name: '키폼 삭제'})
  expect(action).not.toHaveAttribute('data-disabled')
  fireEvent.keyDown(action, {key: 'Enter'})
  expect(onValueChange).toHaveBeenLastCalledWith([30, 30])
  expect(onKeyformDelete).toHaveBeenCalledOnce()
})

test('should discard a cancelled touch target before a context request in the margin', async () => {
  const {view, onValueChange, onKeyformDelete} = renderTrack()
  const marker = view.getByRole('button', {name: '키폼 선택: -30, -30'})
  const track = view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')
  vi.useFakeTimers()
  try {
    const down = new MouseEvent('pointerdown', {bubbles: true, button: 0})
    const cancel = new MouseEvent('pointercancel', {bubbles: true})
    Object.defineProperty(down, 'pointerType', {value: 'touch'})
    Object.defineProperty(cancel, 'pointerType', {value: 'touch'})
    marker.dispatchEvent(down)
    marker.dispatchEvent(cancel)
    fireEvent.contextMenu(track.parentElement!)
    await vi.runAllTimersAsync()
    fireEvent.keyDown(screen.getByRole('menuitem', {name: '키폼 삭제'}), {key: 'Enter'})
    expect(onValueChange).toHaveBeenLastCalledWith([30, 30])
    expect(onKeyformDelete).toHaveBeenCalledOnce()
  } finally {
    vi.useRealTimers()
  }
})
