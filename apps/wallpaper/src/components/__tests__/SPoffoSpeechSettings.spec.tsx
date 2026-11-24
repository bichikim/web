/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import {SPoffoSpeechSettings} from '../SPoffoSpeechSettings'

afterEach(cleanup)

it('should keep both bubble types visible for existing preferences', () => {
  render(() => <SPoffoSpeechSettings value={DEFAULT_POFFO_SPEECH} onChange={vi.fn()} />)
  expect(screen.getByRole('switch', {name: '캐릭터와 대화 표시'})).toBeChecked()
  expect(screen.getByRole('switch', {name: 'Codex 말풍선 표시'})).toBeChecked()
})

it('should save each bubble type independently without replacing voice, position or wrapping', () => {
  const original = {...DEFAULT_POFFO_SPEECH, wrap: false, x: -0.3}
  const [value, setValue] = createSignal<PoffoSpeech>(original)
  const change = vi.fn((speech: PoffoSpeech) => {
    setValue(speech)
  })
  render(() => <SPoffoSpeechSettings value={value()} onChange={change} />)
  fireEvent.click(screen.getByRole('switch', {name: '캐릭터와 대화 표시'}))
  expect(change).toHaveBeenLastCalledWith({...original, showCharacter: false})
  expect(screen.getByRole('switch', {name: 'Codex 말풍선 표시'})).toBeChecked()
  fireEvent.click(screen.getByRole('switch', {name: 'Codex 말풍선 표시'}))
  expect(change).toHaveBeenLastCalledWith({...original, showCharacter: false, showCodex: false})
  fireEvent.click(screen.getByRole('switch', {name: '캐릭터와 대화 표시'}))
  expect(change).toHaveBeenLastCalledWith({...original, showCharacter: true, showCodex: false})
})

it('should retain type preferences while the master display switch is off', () => {
  render(() => (
    <SPoffoSpeechSettings
      value={{...DEFAULT_POFFO_SPEECH, enabled: false, showCharacter: false, showCodex: true}}
      onChange={vi.fn()}
    />
  ))
  expect(screen.getByRole('switch', {name: '캐릭터와 대화 표시'})).toBeDisabled()
  expect(screen.getByRole('switch', {name: 'Codex 말풍선 표시'})).toBeDisabled()
  expect(screen.getByRole('switch', {name: 'Codex 말풍선 표시'})).toBeChecked()
})
