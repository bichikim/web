/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {LanguageLearningSettings} from '../Settings'

it('should expose and update every language learning generation setting', () => {
  const onCountChange = vi.fn()
  const onLanguageChange = vi.fn()
  const onModelChange = vi.fn()
  const onVoiceChange = vi.fn()
  render(() => (
    <LanguageLearningSettings
      count={1}
      disabled={false}
      language="en"
      modelId="full"
      onCountChange={onCountChange}
      onLanguageChange={onLanguageChange}
      onModelChange={onModelChange}
      onVoiceChange={onVoiceChange}
      voiceId="Yuna"
    />
  ))

  for (const [name, value] of [
    ['학습 언어', 'ja'],
    ['만들 개수', '3'],
    ['목소리', 'Hana'],
    ['음성 모델', 'int8'],
  ]) {
    fireEvent.keyDown(screen.getByRole('button', {name: new RegExp(name)}), {key: 'ArrowDown'})
    const option = document.querySelector(`[role="option"][data-key="${value}"]`)
    expect(option).not.toBeNull()
    fireEvent.click(option!)
  }

  expect(onLanguageChange).toHaveBeenCalledWith('ja')
  expect(onCountChange).toHaveBeenCalledWith(3)
  expect(onVoiceChange).toHaveBeenCalledWith('Hana')
  expect(onModelChange).toHaveBeenCalledWith('int8')
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
