/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it} from 'vitest'

import {LanguageLearningTagInput} from '../TagInput'

const renderTagInput = (disabled = false) => {
  const [inputValue, setInputValue] = createSignal('')
  const [tags, setTags] = createSignal<ReadonlyArray<string>>([])
  const result = render(() => (
    <LanguageLearningTagInput
      disabled={disabled}
      inputValue={inputValue()}
      onInputChange={setInputValue}
      onTagsChange={setTags}
      tags={tags()}
    />
  ))

  return {...result, inputValue, tags}
}

beforeEach(() => {
  document.body.innerHTML = ''
})

it('should create, remove, and focus inline tags with the keyboard', () => {
  const {tags} = renderTagInput()
  const input = screen.getByRole('textbox', {name: '프롬프트 단어'})

  fireEvent.input(input, {target: {value: 'HOME'}})
  fireEvent.keyDown(input, {key: ','})
  fireEvent.input(input, {target: {value: 'wave'}})
  fireEvent.keyDown(input, {key: 'Enter'})

  expect(tags()).toEqual(['HOME', 'wave'])
  expect(input).toHaveValue('')
  expect(screen.getByRole('button', {name: 'HOME 태그 삭제'})).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: 'HOME 태그 삭제'}))
  expect(tags()).toEqual(['wave'])

  fireEvent.keyDown(input, {key: 'Backspace'})
  expect(tags()).toEqual([])

  input.blur()
  fireEvent.click(input.parentElement!)
  expect(document.activeElement).toBe(input)
})

it('should commit a Korean IME word only once after composition ends', () => {
  const {tags} = renderTagInput()
  const input = screen.getByRole('textbox', {name: '프롬프트 단어'})

  fireEvent.compositionStart(input)
  fireEvent.input(input, {isComposing: true, target: {value: '한글'}})
  fireEvent.keyDown(input, {isComposing: true, key: ','})

  expect(tags()).toEqual([])
  expect(input).toHaveValue('한글')

  fireEvent.compositionEnd(input, {data: '한글'})
  fireEvent.input(input, {target: {value: '한글,'}})

  expect(tags()).toEqual(['한글'])
  expect(input).toHaveValue('')
})

it('should split pasted tags and commit the remaining input on blur', () => {
  const {tags} = renderTagInput()
  const input = screen.getByRole('textbox', {name: '프롬프트 단어'})

  fireEvent.input(input, {target: {value: 'acknowledge'}})
  fireEvent.paste(input, {
    clipboardData: {getData: () => 'consequence, perspective\nreluctant'},
  })

  expect(tags()).toEqual(['acknowledge', 'consequence', 'perspective', 'reluctant'])
  expect(input).toHaveValue('')

  fireEvent.paste(input, {clipboardData: {getData: () => 'single'}})
  fireEvent.paste(input)
  fireEvent.keyDown(input, {key: 'ArrowLeft'})
  fireEvent.input(input, {target: {value: 'maintain'}})
  fireEvent.blur(input)
  expect(tags()).toEqual(['acknowledge', 'consequence', 'perspective', 'reluctant', 'maintain'])
})

it('should disable tag editing while generation is busy', () => {
  renderTagInput(true)

  expect(screen.getByRole('textbox', {name: '프롬프트 단어'})).toBeDisabled()
})

it('should support vocabulary-specific labels', () => {
  const [inputValue, setInputValue] = createSignal('')
  const [tags, setTags] = createSignal<ReadonlyArray<string>>(['perspective'])
  render(() => (
    <LanguageLearningTagInput
      description="여러 단어 입력"
      getRemoveLabel={(tag) => `${tag} 단어 삭제`}
      inputValue={inputValue()}
      label="모르는 단어"
      onInputChange={setInputValue}
      onTagsChange={setTags}
      placeholder="예: perspective"
      tags={tags()}
    />
  ))

  expect(screen.getByRole('textbox', {name: '모르는 단어'})).toHaveAttribute(
    'placeholder',
    '예: perspective',
  )
  expect(screen.getByText('여러 단어 입력')).toBeDefined()
  expect(screen.getByRole('button', {name: 'perspective 단어 삭제'})).toBeDefined()
})

it('should stop accepting tags at the configured maximum', () => {
  const [inputValue, setInputValue] = createSignal('')
  const [tags, setTags] = createSignal<ReadonlyArray<string>>([])
  render(() => (
    <LanguageLearningTagInput
      inputValue={inputValue()}
      maximumTags={2}
      onInputChange={setInputValue}
      onTagsChange={setTags}
      tags={tags()}
    />
  ))
  const input = screen.getByRole('textbox', {name: '프롬프트 단어'})

  fireEvent.paste(input, {clipboardData: {getData: () => 'home, wave, perspective'}})

  expect(tags()).toEqual(['home', 'wave'])
  expect(input).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: 'home 태그 삭제'}))
  expect(input).toBeEnabled()
})
