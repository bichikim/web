/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PDialogueComposer} from '../components/p-dialogue-composer/PDialogueComposer'

it('should not collapse the composer when Escape cancels an IME composition', () => {
  render(() => <PDialogueComposer />)

  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))
  const input = screen.getByRole('textbox', {name: '대화 입력'})

  fireEvent.input(input, {target: {value: '한글'}})
  fireEvent.keyDown(input, {isComposing: true, key: 'Escape'})

  expect(screen.queryByRole('button', {name: '대화 시작하기'})).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', {name: '대화 입력'})).toBeInTheDocument()
})
