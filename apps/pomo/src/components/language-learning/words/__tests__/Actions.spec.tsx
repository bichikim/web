/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {LanguageLearningWordActions} from '../Actions'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should disable empty selection actions and forward the selected words', () => {
  const word = {
    createdAt: '2026-09-06T00:00:00Z',
    language: 'en' as const,
    memorized: false,
    value: 'apple',
    version: 1 as const,
  }
  const onDelete = vi.fn()
  const onToggleMemorized = vi.fn()
  const [words, setWords] = createSignal<
    ComponentProps<typeof LanguageLearningWordActions>['selectedWords']
  >([])
  render(() => (
    <LanguageLearningWordActions
      selectedWords={words()}
      onDelete={onDelete}
      onToggleMemorized={onToggleMemorized}
    />
  ))
  for (const button of screen.getAllByRole('button')) {
    expect(button).toBeDisabled()
  }
  setWords([word])
  for (const button of screen.getAllByRole('button')) {
    fireEvent.click(button)
  }
  expect(onDelete).toHaveBeenCalledWith([word])
  expect(onToggleMemorized).toHaveBeenCalledWith([word])
})
