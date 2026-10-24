/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {SUPERTONIC_VOICES} from '../../../features/supertonic'
import {VOICE_TEST_SCRIPTS} from '../../voice-test-scripts'
import {VoiceDropZone} from '../DropZone'
import {VoiceFields} from '../Fields'

vi.mock('../DropZone', () => ({VoiceDropZone: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(VoiceDropZone).mockImplementation((props) => {
    Object.values(props)
    return <div>Voice drop zone</div>
  })
})

describe('VoiceFields', () => {
  it('should render built-in voices and forward edited values', () => {
    const onSampleSelect = vi.fn()
    const onTextInput = vi.fn()
    const onVoiceChange = vi.fn()
    const script = VOICE_TEST_SCRIPTS[0]
    const voice = SUPERTONIC_VOICES[0]
    render(() => (
      <VoiceFields
        disabled={false}
        fileError={null}
        importedVoice={null}
        onFileSelect={vi.fn(async () => undefined)}
        onSampleSelect={onSampleSelect}
        onTextInput={onTextInput}
        onVoiceChange={onVoiceChange}
        selectedVoiceId={voice.id}
        text={script.text}
      />
    ))

    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toHaveValue(voice.id)
    expect(selects[1]).toHaveValue(script.id)
    expect(
      screen.getAllByRole('option').some((option) => option.textContent?.includes('여성')),
    ).toBe(true)
    expect(
      screen.getAllByRole('option').some((option) => option.textContent?.includes('남성')),
    ).toBe(true)
    expect(
      screen.getAllByRole('option').some((option) => option.textContent?.includes('(추천)')),
    ).toBe(true)

    fireEvent.change(selects[0], {target: {value: SUPERTONIC_VOICES.at(-1)?.id}})
    expect(onVoiceChange).toHaveBeenCalledOnce()
    fireEvent.change(selects[1], {target: {value: VOICE_TEST_SCRIPTS.at(-1)?.id}})
    expect(onSampleSelect).toHaveBeenCalledWith(VOICE_TEST_SCRIPTS.at(-1)?.text)
    fireEvent.input(screen.getByRole('textbox'), {target: {value: '새 대사'}})
    expect(onTextInput).toHaveBeenCalledOnce()
  })

  it('should render a disabled imported voice and ignore an unknown script', () => {
    const onSampleSelect = vi.fn()
    render(() => (
      <VoiceFields
        disabled
        fileError="invalid voice"
        importedVoice={{name: 'My voice', size: 1_000}}
        onFileSelect={vi.fn(async () => undefined)}
        onSampleSelect={onSampleSelect}
        onTextInput={vi.fn()}
        onVoiceChange={vi.fn()}
        selectedVoiceId={SUPERTONIC_VOICES[0].id}
        text="custom text"
      />
    ))

    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toHaveValue('custom')
    expect(screen.getByRole('option', {name: '커스텀 · My voice'})).toBeInTheDocument()
    expect(selects[1]).toHaveValue('')
    fireEvent.change(selects[1], {target: {value: 'unknown-script'}})
    expect(onSampleSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByText('11 / 3000')).toBeInTheDocument()
  })
})
