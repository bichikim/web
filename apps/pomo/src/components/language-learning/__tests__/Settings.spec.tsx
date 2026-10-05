/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {PSelectSingleProps} from '../../p-select/PSelect'

import {LanguageLearningSettings} from '../Settings'

vi.mock('../../p-select/PSelect', () => ({
  PSelect: (props: PSelectSingleProps<string>) => (
    <label>
      {props.label}
      <select
        aria-label={props.label}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      >
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    </label>
  ),
}))

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
  const view = render(() => (
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

  const select = within(view.container).getByRole('combobox', {
    name: new RegExp(setting.name),
  })
  expect(
    Array.from(select.querySelectorAll('option')).some((option) => option.value === setting.value),
  ).toBe(true)
  fireEvent.change(select, {target: {value: setting.value}})

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

  for (const select of screen.getAllByRole('combobox')) {
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

  expect(screen.getByRole('combobox', {name: /학습 언어/})).toBeDisabled()
  expect(screen.getByRole('combobox', {name: /만들 개수/})).toBeDisabled()
  expect(screen.getByRole('combobox', {name: /목소리/})).toBeEnabled()
  expect(screen.getByRole('combobox', {name: /음성 모델/})).toBeEnabled()
})
