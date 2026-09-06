/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {LanguageLearningWordInputSection} from '../InputSection'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should forward word input and saving while respecting the save state', () => {
  const onInputChange = vi.fn()
  const onSave = vi.fn()
  const [disabled, setDisabled] = createSignal(false)
  render(() => (
    <LanguageLearningWordInputSection
      inputValue=""
      onInputChange={onInputChange}
      onSave={onSave}
      onTagsChange={vi.fn()}
      saveDisabled={disabled()}
      tags={[]}
    />
  ))
  fireEvent.input(screen.getByRole('textbox'), {target: {value: 'apple'}})
  expect(onInputChange).toHaveBeenCalledWith('apple')
  const button = screen.getByRole('button', {name: m.learning_words_save()})
  fireEvent.click(button)
  expect(onSave).toHaveBeenCalledOnce()
  setDisabled(true)
  expect(button).toBeDisabled()
})
