/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

vi.mock('../../PRadioSwitch', () => ({
  PRadioSwitch: (props: {
    readonly disabled?: boolean
    readonly label: string
    readonly onChange: (value: 'direct' | 'saved') => void
    readonly options: ReadonlyArray<{
      readonly disabled?: boolean
      readonly label: string
      readonly value: 'direct' | 'saved'
    }>
    readonly value: 'direct' | 'saved'
  }) => (
    <div data-label={props.label} data-value={props.value}>
      {
        props.options.map((option) => (
          <button
            disabled={props.disabled || option.disabled}
            onClick={() => props.onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        )) as JSX.Element
      }
    </div>
  ),
}))

import {LanguageLearningWordSourceControl} from '../WordSource'

const renderControl = (source: 'direct' | 'saved', disabled = false, savedWordCount = 7) => {
  const onSourceChange = vi.fn()
  render(() => (
    <LanguageLearningWordSourceControl
      disabled={disabled}
      inputValue=""
      onInputChange={vi.fn()}
      onSourceChange={onSourceChange}
      onWordsChange={vi.fn()}
      savedWordCount={savedWordCount}
      source={source}
      words={source === 'saved' ? ['home', 'wave', 'perspective'] : []}
    />
  ))
  return onSourceChange
}

it('should show the two-word direct input and switch sources', () => {
  const onSourceChange = renderControl('direct')

  const input = screen.getByRole('textbox', {name: '프롬프트 단어'})
  expect(input).toBeEnabled()
  expect(screen.getByText(/최대 2개/u)).toBeInTheDocument()
  fireEvent.input(input, {target: {value: 'home'}})
  fireEvent.keyDown(input, {key: 'Enter'})
  fireEvent.click(screen.getByRole('button', {name: '학습 단어에서 가져오기'}))
  expect(onSourceChange).toHaveBeenCalledWith('saved')
})

it('should summarize saved-word selection and preserve disabled interaction', () => {
  renderControl('saved', true)

  expect(screen.queryByRole('textbox', {name: '프롬프트 단어'})).toBeNull()
  expect(screen.getByText(/학습 단어 7개 중 3~7개/u)).toBeInTheDocument()
  expect(screen.getByText('이번 프롬프트 단어: home, wave, perspective')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '직접 입력'})).toBeDisabled()
})

it('should explain when the selected language has fewer than three saved words', () => {
  renderControl('saved', false, 2)

  expect(screen.getByText(/최소 3개를 저장/u)).toHaveClass('text-danger')
  expect(screen.getByRole('button', {name: '학습 단어에서 가져오기'})).toBeDisabled()
})
