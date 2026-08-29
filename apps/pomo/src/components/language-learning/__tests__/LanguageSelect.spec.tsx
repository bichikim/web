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
