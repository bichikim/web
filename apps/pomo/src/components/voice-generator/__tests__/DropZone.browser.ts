import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {VoiceDropZone} from '../DropZone'

afterEach(cleanup)

it('should retain nested hover across disabled changes and clear it on an empty native drop', () => {
  const [disabled, setDisabled] = createSignal(false)
  const onFileSelect = vi.fn(async () => undefined)
  render(() =>
    createComponent(VoiceDropZone, {
      get disabled() {
        return disabled()
      },
      fileError: null,
      importedVoice: null,
      onFileSelect,
    }),
  )
  const input = screen.getByLabelText(/JSON 파일을 놓거나 클릭해 선택/u)
  const dropZone = input.closest('label')!
  const hint = screen.getByText('JSON 파일을 놓거나 클릭해 선택')
  const dataTransfer = new DataTransfer()

  fireEvent.dragLeave(dropZone, {dataTransfer})
  fireEvent.dragEnter(dropZone, {dataTransfer})
  fireEvent.dragEnter(hint, {dataTransfer})
  setDisabled(true)
  fireEvent.dragEnter(hint, {dataTransfer})
  fireEvent.dragLeave(hint, {dataTransfer})

  expect(input).toBeDisabled()
  expect(screen.getByText('여기에 놓아 가져오기')).toBeInTheDocument()
  expect(dropZone).toHaveClass('border-#f2a7b8')

  const emptyDrop = new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer})
  fireEvent(dropZone, emptyDrop)
  expect(emptyDrop.defaultPrevented).toBe(true)
  expect(screen.getByText('JSON 파일을 놓거나 클릭해 선택')).toBeInTheDocument()
  expect(onFileSelect).not.toHaveBeenCalled()

  setDisabled(false)
  fireEvent.dragLeave(dropZone, {dataTransfer})
  fireEvent.dragEnter(dropZone, {dataTransfer})
  fireEvent.dragLeave(dropZone, {dataTransfer})
  expect(dropZone).not.toHaveClass('border-#f2a7b8')
})

it('should select the first native file and retain callback reentry after resetting depth', () => {
  let selectedName = ''
  const onFileSelect = vi.fn((file: File | undefined) => {
    selectedName = file?.name ?? ''
    fireEvent.dragEnter(dropZone)
    return Promise.resolve()
  })
  render(() =>
    createComponent(VoiceDropZone, {
      disabled: false,
      fileError: null,
      importedVoice: null,
      onFileSelect,
    }),
  )
  const input = screen.getByLabelText(/JSON 파일을 놓거나 클릭해 선택/u)
  const dropZone = input.closest('label')!
  const first = new File(['{}'], 'first.json', {type: 'application/json'})
  const second = new File(['{}'], 'second.json', {type: 'application/json'})
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(first)
  dataTransfer.items.add(second)

  fireEvent.dragEnter(dropZone, {dataTransfer})
  fireEvent.dragEnter(dropZone, {dataTransfer})
  const dragOver = new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer})
  fireEvent(dropZone, dragOver)
  expect(dragOver.defaultPrevented).toBe(true)
  const drop = new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer})
  fireEvent(dropZone, drop)
  expect(drop.defaultPrevented).toBe(true)

  expect(onFileSelect).toHaveBeenCalledExactlyOnceWith(first)
  expect(selectedName).toBe('first.json')
  expect(screen.getByText('여기에 놓아 가져오기')).toBeInTheDocument()
  fireEvent.dragLeave(dropZone, {dataTransfer})
  expect(screen.getByText('JSON 파일을 놓거나 클릭해 선택')).toBeInTheDocument()
})
