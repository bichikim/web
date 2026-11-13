/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {type ImportedVoice} from '../DropZone'
import {VoiceFields} from '../Fields'

it('should forward a dropped file through pending and completed selection', async () => {
  const [disabled, setDisabled] = createSignal(false)
  const [importedVoice, setImportedVoice] = createSignal<ImportedVoice | null>(null)
  const completion = Promise.withResolvers<void>()
  let selection = Promise.resolve()
  const onFileSelect = vi.fn((file: File | undefined) => {
    setDisabled(true)
    selection = completion.promise.then(() => {
      if (file !== undefined) {
        setImportedVoice({name: file.name, size: file.size})
      }
      setDisabled(false)
    })
    return selection
  })
  const view = render(() => (
    <VoiceFields
      disabled={disabled()}
      fileError={null}
      importedVoice={importedVoice()}
      onFileSelect={onFileSelect}
      onSampleSelect={vi.fn()}
      onTextInput={vi.fn()}
      onVoiceChange={vi.fn()}
      selectedVoiceId="Yuna"
      text="테스트 대사"
    />
  ))

  try {
    const input = screen.getByLabelText(/JSON 파일을 놓거나 클릭해 선택/u)
    const dropZone = input.closest('label')!
    const file = new File(['{}'], 'custom.json', {type: 'application/json'})
    const ignored = new File(['{}'], 'ignored.json', {type: 'application/json'})

    fireEvent.dragEnter(dropZone)
    expect(screen.getByText('여기에 놓아 가져오기')).toBeInTheDocument()
    fireEvent.drop(dropZone, {dataTransfer: {files: [file, ignored]}})

    expect(onFileSelect).toHaveBeenCalledExactlyOnceWith(file)
    expect(input).toBeDisabled()
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByText('JSON 파일을 놓거나 클릭해 선택')).toBeInTheDocument()

    completion.resolve()
    await selection

    expect(input).toBeEnabled()
    expect(screen.getByRole('textbox')).toBeEnabled()
    expect(screen.getByRole('option', {name: '커스텀 · custom.json'})).toHaveValue('custom')
    expect(screen.getByText('custom.json').parentElement).toHaveTextContent('1KB 선택됨')
  } finally {
    completion.resolve()
    await selection
    view.unmount()
  }
})
