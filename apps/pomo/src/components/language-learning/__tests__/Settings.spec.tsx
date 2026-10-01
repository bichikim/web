/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {LanguageLearningSettings} from '../Settings'

const createChangeHandlers = () => ({
  count: vi.fn(),
  language: vi.fn(),
  model: vi.fn(),
  voice: vi.fn(),
})

const renderSettings = (handlers: ReturnType<typeof createChangeHandlers>, disabled = false) => {
  render(() => (
    <LanguageLearningSettings
      count={1}
      disabled={disabled}
      language="en"
      modelId="full"
      onCountChange={handlers.count}
      onLanguageChange={handlers.language}
      onModelChange={handlers.model}
      onVoiceChange={handlers.voice}
      voiceId="Yuna"
    />
  ))
}

const updateCases = [
  {buttonName: '학습 언어', expectedValue: 'ja', handler: 'language', optionValue: 'ja'},
  {buttonName: '만들 개수', expectedValue: 3, handler: 'count', optionValue: '3'},
  {buttonName: '목소리', expectedValue: 'Hana', handler: 'voice', optionValue: 'Hana'},
  {buttonName: '음성 모델', expectedValue: 'int8', handler: 'model', optionValue: 'int8'},
] as const

it.each(updateCases)('should update the $buttonName setting', (testCase) => {
  const handlers = createChangeHandlers()
  renderSettings(handlers)

  fireEvent.keyDown(screen.getByRole('button', {name: new RegExp(testCase.buttonName)}), {
    key: 'ArrowDown',
  })
  const option = document.querySelector(`[role="option"][data-key="${testCase.optionValue}"]`)
  expect(option).not.toBeNull()
  fireEvent.click(option!)

  expect(handlers[testCase.handler]).toHaveBeenCalledWith(testCase.expectedValue)
})

it('should disable every dropdown', () => {
  const handlers = createChangeHandlers()
  renderSettings(handlers, true)

  for (const select of screen.getAllByRole('button')) {
    expect(select).toBeDisabled()
  }

  expect(handlers.count).not.toHaveBeenCalled()
  expect(handlers.language).not.toHaveBeenCalled()
  expect(handlers.model).not.toHaveBeenCalled()
  expect(handlers.voice).not.toHaveBeenCalled()
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
