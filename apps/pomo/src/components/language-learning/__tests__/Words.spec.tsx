/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {readLanguageLearningWords} from '../../../features/language-learning'
import {PSelect} from '../../PSelect'
import {LanguageLearningWords} from '../Words'

vi.mock('../../PSelect', () => ({PSelect: vi.fn()}))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(PSelect).mockImplementation((props) => {
    if (props.multiple === true) {
      return null
    }

    return (
      <label>
        {props.label}
        <select onChange={(event) => props.onChange(event.currentTarget.value)} value={props.value}>
          <For each={props.options}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
      </label>
    )
  })
})

it('should add several unknown words at once and filter them by language', () => {
  const result = render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  expect(input.parentElement?.className).toContain('bg-surface')
  expect(screen.getByRole('button', {name: '단어 저장'}).className).toContain('rounded-control')
  expect(vi.mocked(PSelect).mock.calls[0]?.[0].class).toBe('w-full')

  fireEvent.paste(input, {
    clipboardData: {getData: () => 'acknowledge, perspective\nreluctant'},
  })
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  expect(readLanguageLearningWords().map((word) => word.value)).toEqual([
    'acknowledge',
    'perspective',
    'reluctant',
  ])
  expect(screen.getByText('3개')).toBeDefined()
  expect(screen.getByText('acknowledge')).toBeDefined()

  fireEvent.change(screen.getByRole('combobox', {name: '학습 언어'}), {
    target: {value: 'ja'},
  })
  expect(screen.getByText('저장한 단어가 없어요.').className).toContain('border-dashed')

  result.unmount()
})

it('should save the current input, deduplicate words, and delete a saved word', () => {
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'Home,home'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  expect(readLanguageLearningWords().map((word) => word.value)).toEqual(['Home'])
  fireEvent.click(screen.getByRole('button', {name: 'Home 삭제'}))
  expect(readLanguageLearningWords()).toEqual([])
})

it('should use the check button to move words between saved and memorized groups', () => {
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'Home'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  const memorizeButton = screen.getByRole('button', {name: 'Home 외운 단어로 표시'})
  const deleteButton = screen.getByRole('button', {name: 'Home 삭제'})
  const wordItem = memorizeButton.closest('li')
  const wordList = wordItem?.parentElement

  expect(memorizeButton).toHaveAttribute('aria-pressed', 'false')
  expect(wordItem?.children[0]).toBe(memorizeButton)
  expect(wordItem?.children[1]).toHaveTextContent('Home')
  expect(wordItem?.children[2]).toBe(deleteButton)
  expect(wordItem).toHaveClass('inline-flex', 'max-w-full', 'min-h-9')
  expect(wordItem).not.toHaveClass('w-full')
  expect(memorizeButton).toHaveClass('size-9')
  expect(deleteButton).toHaveClass('size-9')
  expect(wordList).toHaveClass('max-h-[19rem]', 'overflow-y-auto', 'flex-wrap')
  fireEvent.click(memorizeButton)

  expect(readLanguageLearningWords()).toMatchObject([{memorized: true, value: 'Home'}])
  const unmemorizeButton = screen.getByRole('button', {name: 'Home 외운 단어 표시 해제'})
  expect(unmemorizeButton).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(unmemorizeButton)

  expect(readLanguageLearningWords()).toMatchObject([{memorized: false, value: 'Home'}])
  expect(screen.getByRole('button', {name: 'Home 외운 단어로 표시'})).toBeDefined()
})

it('should report storage failures while saving and deleting words', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const result = render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  fireEvent.input(input, {target: {value: 'unavailable'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  expect(screen.getByRole('status')).toHaveTextContent('학습 단어를 저장하지 못했어요.')

  setItem.mockRestore()
  result.unmount()

  const deleteResult = render(() => <LanguageLearningWords />)
  const deleteInput = screen.getByRole('textbox', {name: '모르는 단어'})
  fireEvent.input(deleteInput, {target: {value: 'removable'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  const failingSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  fireEvent.click(screen.getByRole('button', {name: 'removable 삭제'}))
  expect(screen.getByRole('status')).toHaveTextContent('학습 단어를 삭제하지 못했어요.')
  expect(error).toHaveBeenCalledTimes(2)

  failingSetItem.mockRestore()
  deleteResult.unmount()
})

it('should report storage failures while changing the memorized state', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'unavailable'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  fireEvent.click(screen.getByRole('button', {name: 'unavailable 외운 단어로 표시'}))
  expect(screen.getByRole('status')).toHaveTextContent('학습 단어의 외움 상태를 바꾸지 못했어요.')
  expect(error).toHaveBeenCalledOnce()

  setItem.mockRestore()
})
