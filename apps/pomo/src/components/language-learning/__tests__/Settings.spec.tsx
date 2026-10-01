/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {LanguageLearningSettings} from '../Settings'

it.each([
  {name: '학습 언어', setting: 'language', value: 'ja'},
  {name: '만들 개수', setting: 'count', value: '3'},
  {name: '목소리', setting: 'voice', value: 'Hana'},
  {name: '음성 모델', setting: 'model', value: 'int8'},
] as const)('should update the $setting generation setting', (setting) => {
  const callbacks = {
    count: vi.fn(),
    language: vi.fn(),
    model: vi.fn(),
    voice: vi.fn(),
  }
  render(() => (
    <LanguageLearningSettings
      count={1}
      disabled={false}
      language="en"
      modelId="full"
      onCountChange={callbacks.count}
      onLanguageChange={callbacks.language}
      onModelChange={callbacks.model}
      onVoiceChange={callbacks.voice}
      voiceId="Yuna"
    />
  ))

  fireEvent.keyDown(screen.getByRole('button', {name: new RegExp(setting.name)}), {
    key: 'ArrowDown',
  })
  const option = screen
    .getAllByRole('option')
    .find((candidate) => candidate.dataset.key === setting.value)
  expect(option).toBeDefined()
  fireEvent.click(option!)

  expect(callbacks[setting.setting]).toHaveBeenCalledWith(
    setting.setting === 'count' ? Number(setting.value) : setting.value,
  )
  expect(callbacks[setting.setting]).toHaveBeenCalledTimes(1)
  for (const [name, callback] of Object.entries(callbacks)) {
    if (name !== setting.setting) {
      expect(callback).not.toHaveBeenCalled()
    }
  }
})

it('should disable every dropdown', () => {
  const onChange = vi.fn()
  render(() => (
    <LanguageLearningSettings
      count={1}
      disabled
      language="en"
      modelId="full"
      onCountChange={onChange}
      onLanguageChange={onChange}
      onModelChange={onChange}
      onVoiceChange={onChange}
      voiceId="Yuna"
    />
  ))

  for (const select of screen.getAllByRole('button')) {
    expect(select).toBeDisabled()
  }

  expect(onChange).not.toHaveBeenCalled()
})

it('should lock sentence settings while preserving voice regeneration choices', () => {
  render(() => (
    <LanguageLearningSettings
      count={1}
      disabled={false}
      language="en"
      modelId="full"
      onCountChange={() => undefined}
      onLanguageChange={() => undefined}
      onModelChange={() => undefined}
      onVoiceChange={() => undefined}
      sentenceDisabled
      voiceId="Yuna"
    />
  ))

  expect(screen.getByRole('button', {name: /학습 언어/})).toBeDisabled()
  expect(screen.getByRole('button', {name: /만들 개수/})).toBeDisabled()
  expect(screen.getByRole('button', {name: /목소리/})).toBeEnabled()
  expect(screen.getByRole('button', {name: /음성 모델/})).toBeEnabled()
})
