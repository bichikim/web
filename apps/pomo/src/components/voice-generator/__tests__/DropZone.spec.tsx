/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {VoiceDropZone} from '../DropZone'

describe('VoiceDropZone', () => {
  it('should select a file from the picker and display imported voice details', () => {
    const onFileSelect = vi.fn(async () => undefined)
    const file = new File(['{}'], 'voice.json', {type: 'application/json'})
    render(() => (
      <VoiceDropZone
        disabled={false}
        fileError={null}
        importedVoice={{name: 'voice.json', size: 1_001}}
        onFileSelect={onFileSelect}
      />
    ))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {target: {files: [file]}})
    expect(onFileSelect).toHaveBeenCalledWith(file)
    expect(input.value).toBe('')
    expect(screen.getByText(/voice.json/).parentElement).toHaveTextContent('2KB 선택됨')
  })

  it('should handle nested dragging and accept a dropped file', () => {
    const onFileSelect = vi.fn(async () => undefined)
    const file = new File(['{}'], 'voice.json', {type: 'application/json'})
    render(() => (
      <VoiceDropZone
        disabled={false}
        fileError="invalid voice"
        importedVoice={null}
        onFileSelect={onFileSelect}
      />
    ))
    const dropZone = screen.getByText('JSON 파일을 놓거나 클릭해 선택').closest('label')!
    const dataTransfer = {dropEffect: '', files: [file]}

    fireEvent.dragEnter(dropZone, {dataTransfer})
    fireEvent.dragEnter(dropZone, {dataTransfer})
    expect(screen.getByText('여기에 놓아 가져오기')).toBeInTheDocument()
    fireEvent.dragLeave(dropZone, {dataTransfer})
    expect(screen.getByText('여기에 놓아 가져오기')).toBeInTheDocument()
    fireEvent.dragLeave(dropZone, {dataTransfer})
    expect(screen.getByText('JSON 파일을 놓거나 클릭해 선택')).toBeInTheDocument()

    fireEvent.dragOver(dropZone, {dataTransfer})
    expect(dataTransfer.dropEffect).toBe('copy')
    fireEvent.dragOver(dropZone, {dataTransfer: null})
    fireEvent.drop(dropZone, {dataTransfer})
    expect(onFileSelect).toHaveBeenCalledWith(file)
    expect(screen.getByRole('alert')).toHaveTextContent('invalid voice')
  })

  it('should ignore file interactions while disabled or empty', () => {
    const onFileSelect = vi.fn(async () => undefined)
    const file = new File(['{}'], 'voice.json', {type: 'application/json'})
    render(() => (
      <VoiceDropZone disabled fileError={null} importedVoice={null} onFileSelect={onFileSelect} />
    ))
    const dropZone = screen.getByText('JSON 파일을 놓거나 클릭해 선택').closest('label')!
    const dataTransfer = {dropEffect: '', files: [file]}

    fireEvent.dragEnter(dropZone, {dataTransfer})
    expect(screen.queryByText('여기에 놓아 가져오기')).not.toBeInTheDocument()
    fireEvent.dragOver(dropZone, {dataTransfer})
    expect(dataTransfer.dropEffect).toBe('none')
    fireEvent.drop(dropZone, {dataTransfer})
    fireEvent.drop(dropZone, {dataTransfer: {dropEffect: '', files: []}})
    expect(onFileSelect).not.toHaveBeenCalled()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {target: {files: undefined}})
    expect(onFileSelect).toHaveBeenCalledWith(undefined)
  })

  it('should retain nested hover while disabled and recover after an empty drop', () => {
    const [disabled, setDisabled] = createSignal(false)
    const onFileSelect = vi.fn(async () => undefined)
    render(() => (
      <VoiceDropZone
        disabled={disabled()}
        fileError={null}
        importedVoice={null}
        onFileSelect={onFileSelect}
      />
    ))
    const hint = screen.getByText('JSON 파일을 놓거나 클릭해 선택')
    const dropZone = hint.closest('label')!

    fireEvent.dragLeave(dropZone)
    fireEvent.dragEnter(dropZone)
    fireEvent.dragEnter(hint)
    setDisabled(true)
    fireEvent.dragEnter(hint)
    fireEvent.dragLeave(hint)
    expect(screen.getByText('여기에 놓아 가져오기')).toBeInTheDocument()
    expect(dropZone).toHaveClass('border-#f2a7b8')

    fireEvent.drop(dropZone, {dataTransfer: null})
    expect(screen.getByText('JSON 파일을 놓거나 클릭해 선택')).toBeInTheDocument()
    expect(onFileSelect).not.toHaveBeenCalled()

    setDisabled(false)
    fireEvent.dragLeave(dropZone)
    fireEvent.dragEnter(dropZone)
    fireEvent.dragLeave(dropZone)
    expect(screen.getByText('JSON 파일을 놓거나 클릭해 선택')).toBeInTheDocument()
    expect(dropZone).not.toHaveClass('border-#f2a7b8')
  })

  it('should reset the previous depth and retain a drag started by selection', () => {
    const onFileSelect = vi.fn(() => {
      fireEvent.dragEnter(dropZone)
      return Promise.resolve()
    })
    render(() => (
      <VoiceDropZone
        disabled={false}
        fileError={null}
        importedVoice={null}
        onFileSelect={onFileSelect}
      />
    ))
    const dropZone = screen.getByText('JSON 파일을 놓거나 클릭해 선택').closest('label')!
    const file = new File(['{}'], 'voice.json', {type: 'application/json'})

    fireEvent.dragEnter(dropZone)
    fireEvent.dragEnter(dropZone)
    fireEvent.drop(dropZone, {dataTransfer: {files: [file]}})

    expect(onFileSelect).toHaveBeenCalledExactlyOnceWith(file)
    expect(screen.getByText('여기에 놓아 가져오기')).toBeInTheDocument()
    fireEvent.dragLeave(dropZone)
    expect(screen.getByText('JSON 파일을 놓거나 클릭해 선택')).toBeInTheDocument()
  })
})
