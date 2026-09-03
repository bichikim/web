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

  fireEvent.change(screen.getByRole('combobox', {name: '학습 언어'}), {
    target: {value: 'ja'},
  })
  fireEvent.change(screen.getByRole('combobox', {name: '만들 개수'}), {target: {value: '3'}})
  fireEvent.change(screen.getByRole('combobox', {name: '목소리'}), {
    target: {value: 'Hana'},
  })
  fireEvent.change(screen.getByRole('combobox', {name: '음성 모델'}), {
    target: {value: 'int8'},
  })

  expect(onLanguageChange).toHaveBeenCalledWith('ja')
  expect(onCountChange).toHaveBeenCalledWith(3)
  expect(onVoiceChange).toHaveBeenCalledWith('Hana')
  expect(onModelChange).toHaveBeenCalledWith('int8')
  expect(screen.getByRole('option', {name: '한국어'})).toBeDefined()
  expect(screen.getByRole('option', {name: '영어'})).toBeDefined()
  expect(screen.getByRole('option', {name: '일본어'})).toBeDefined()
  expect(screen.getByRole('combobox', {name: '학습 언어'}).closest('label')).toHaveClass(
    '[&_select]:bg-surface-strong',
    '[&_select]:text-foreground',
  )
})

it('should ignore unknown setting values and disable every select', () => {
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

  for (const select of screen.getAllByRole('combobox')) {
    select.removeAttribute('disabled')
    fireEvent.change(select, {target: {value: 'unknown'}})
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

  expect(screen.getByRole('combobox', {name: '학습 언어'})).toBeDisabled()
  expect(screen.getByRole('combobox', {name: '만들 개수'})).toBeDisabled()
  expect(screen.getByRole('combobox', {name: '목소리'})).toBeEnabled()
  expect(screen.getByRole('combobox', {name: '음성 모델'})).toBeEnabled()
})
