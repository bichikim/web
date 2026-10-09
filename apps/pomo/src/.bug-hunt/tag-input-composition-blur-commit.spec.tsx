/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it} from 'vitest'

import {LanguageLearningTagInput} from '../components/language-learning/TagInput'

it('should not commit a tag while IME composition is active on blur', () => {
  const [tags, setTags] = createSignal<string[]>([])
  const [inputValue, setInputValue] = createSignal('')

  render(() => (
    <LanguageLearningTagInput
      inputValue={inputValue()}
      onInputChange={setInputValue}
      onTagsChange={setTags}
      tags={tags()}
    />
  ))

  const input = screen.getByRole('textbox')
  fireEvent.compositionStart(input)
  fireEvent.input(input, {target: {value: '한글'}})
  fireEvent.blur(input)

  expect(tags()).toEqual([])
  expect(input).toHaveValue('한글')
})
