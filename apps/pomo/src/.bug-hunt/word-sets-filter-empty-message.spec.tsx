/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {LanguageLearningWordSets} from '../components/language-learning/WordSets'

const GLOBAL_EMPTY_MESSAGE = '가져올 수 있는 단어 세트를 준비 중이에요.'

it('should not show the global empty catalog message when another language filter has no sets', () => {
  render(() => (
    <LanguageLearningWordSets sets={[{id: 'ko-basic', language: 'ko', title: '한글 기초'}]} />
  ))

  expect(screen.queryByText(GLOBAL_EMPTY_MESSAGE)).toBeNull()

  fireEvent.click(screen.getByRole('tab', {name: '영어'}))

  expect(screen.queryByRole('listitem')).toBeNull()
  expect(screen.queryByText(GLOBAL_EMPTY_MESSAGE)).toBeNull()
})
