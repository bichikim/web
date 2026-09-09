/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {Upload} from '../Upload'

it('should accept multiple dropped files once and clear the drag state', () => {
  const onFiles = vi.fn()
  render(() => <Upload onFiles={onFiles} />)
  const zone = screen.getByRole('group')
  const files = [
    new File(['a'], 'a.png', {type: 'image/png'}),
    new File(['b'], 'b.mp4', {type: 'video/mp4'}),
  ]
  const dataTransfer = {dropEffect: 'none', files, types: ['Files']}
  fireEvent.dragOver(zone, {dataTransfer})
  expect(zone).toHaveAttribute('data-dragging', 'true')
  fireEvent.drop(screen.getByLabelText('사진 및 동영상 추가', {selector: 'input'}), {dataTransfer})
  expect(onFiles).toHaveBeenCalledExactlyOnceWith(files)
  expect(zone).toHaveAttribute('data-dragging', 'false')
})

it('should reject drops while disabled and keep the file picker accessible', () => {
  const onFiles = vi.fn()
  const [disabled, setDisabled] = createSignal(true)
  render(() => <Upload disabled={disabled()} onFiles={onFiles} />)
  const zone = screen.getByRole('group')
  const file = new File(['a'], 'a.png', {type: 'image/png'})
  fireEvent.drop(zone, {dataTransfer: {files: [file], types: ['Files']}})
  expect(onFiles).not.toHaveBeenCalled()
  expect(screen.getByLabelText('사진 및 동영상 추가', {selector: 'input'})).toBeDisabled()
  setDisabled(false)
  fireEvent.change(screen.getByLabelText('사진 및 동영상 추가', {selector: 'input'}), {
    target: {files: [file]},
  })
  expect(onFiles).toHaveBeenCalledExactlyOnceWith([file])
})

it('should prevent file navigation outside the target only while mounted', () => {
  const {unmount} = render(() => <Upload onFiles={vi.fn()} />)
  const drop = () => {
    const event = new Event('drop', {cancelable: true})
    Object.defineProperty(event, 'dataTransfer', {value: {types: ['Files']}})
    window.dispatchEvent(event)
    return event.defaultPrevented
  }
  expect(drop()).toBe(true)
  unmount()
  expect(drop()).toBe(false)
})
