/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {createKeyedTaskQueue} from 'src/utils/create-keyed-task-queue'
import type {LanguageLearningLanguage} from '../../../features/language-learning/schema'
import {LanguageLearningLanguageSelect} from '../LanguageSelect'

vi.mock('src/utils/create-keyed-task-queue', () => ({createKeyedTaskQueue: vi.fn()}))

// Keep cold-import calls observable after per-test mock cleanup.
const coordinatorsDuringImport = vi.mocked(createKeyedTaskQueue).mock.calls.length

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should preserve controlled selection without initializing audio storage coordinators', () => {
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>()
  const onChange = vi.fn((value: LanguageLearningLanguage) => setLanguage(value))
  render(() => <LanguageLearningLanguageSelect onChange={onChange} value={language()} />)
  const group = screen.getByRole('group')
  const select = group.querySelector('select')!
  const trigger = screen.getByRole('button', {name: '학습 언어 영어'})
  expect(
    Array.from(select.querySelectorAll('option'))
      .filter((option) => option.value !== '')
      .map((option) => ({label: option.textContent, value: option.value})),
  ).toEqual([
    {label: '한국어', value: 'ko'},
    {label: '영어', value: 'en'},
    {label: '일본어', value: 'ja'},
  ])

  fireEvent.change(select, {target: {value: 'ko'}})

  expect(onChange).toHaveBeenCalledExactlyOnceWith('ko')
  expect(screen.getByRole('button', {name: '학습 언어 한국어'})).toBe(trigger)

  setLanguage('ja')
  expect(screen.getByRole('button', {name: '학습 언어 일본어'})).toBe(trigger)
  setLanguage(undefined)
  expect(screen.getByRole('button', {name: '학습 언어 영어'})).toBe(trigger)
  expect(onChange).toHaveBeenCalledOnce()
  expect(coordinatorsDuringImport).toBe(0)
  expect(createKeyedTaskQueue).not.toHaveBeenCalled()
})
