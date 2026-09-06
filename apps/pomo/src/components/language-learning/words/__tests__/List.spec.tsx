/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {LanguageLearningWordList} from '../List'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should expose selected words and forward word selection', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const word = {
    createdAt: '2026-09-06T00:00:00Z',
    language: 'en' as const,
    memorized: false,
    value: 'apple',
    version: 1 as const,
  }
  const onSelect = vi.fn()
  render(() => (
    <LanguageLearningWordList
      autoplayKey={() => null}
      pronunciationBusy={false}
      getAudioUrl={() => null}
      isPronunciationLoading={() => false}
      onDelete={vi.fn()}
      onPronounce={vi.fn()}
      onToggleMemorized={vi.fn()}
      emptyMessage="단어 없음"
      onSelect={onSelect}
      selectedWords={() => [word]}
      words={[word]}
    />
  ))
  const button = screen.getByRole('button', {name: 'apple'})
  expect(button).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(button)
  expect(onSelect).toHaveBeenCalledWith(word)
})
