/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {LanguageLearningGenerateButton} from '../GenerateButton'

it('should trigger generation unless disabled', () => {
  const onPress = vi.fn()
  const {unmount} = render(() => <LanguageLearningGenerateButton onPress={onPress} />)
  fireEvent.click(screen.getByRole('button', {name: '학습 문장과 음성 만들기'}))
  expect(onPress).toHaveBeenCalledOnce()
  unmount()

  render(() => <LanguageLearningGenerateButton disabled onPress={onPress} />)
  expect(screen.getByRole('button', {name: '학습 문장과 음성 만들기'})).toBeDisabled()
})
