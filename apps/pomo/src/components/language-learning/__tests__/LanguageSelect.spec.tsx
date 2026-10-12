/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {LanguageLearningLanguageSelect} from '../LanguageSelect'

it('should provide multilingual options and an English fallback', () => {
  render(() => <LanguageLearningLanguageSelect />)

  expect(screen.getByRole('button', {name: '학습 언어 영어'})).toBeDefined()
})

it('should emit a selected language', () => {
  const onChange = vi.fn()
  render(() => <LanguageLearningLanguageSelect onChange={onChange} value="ko" />)

  fireEvent.change(document.querySelector('select')!, {target: {value: 'ja'}})

  expect(onChange).toHaveBeenCalledWith('ja')
})

it('should preserve language option order and translated labels', () => {
  render(() => <LanguageLearningLanguageSelect />)

  const select = screen.getByRole('group').querySelector('select')!
  expect(
    Array.from(select.querySelectorAll('option'))
      .filter((option) => option.value !== '')
      .map((option) => ({label: option.textContent, value: option.value})),
  ).toEqual([
    {label: '한국어', value: 'ko'},
    {label: '영어', value: 'en'},
    {label: '일본어', value: 'ja'},
  ])
})
