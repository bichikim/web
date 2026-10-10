/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {useLanguageLearningWords} from '../../../../features/language-learning/use-words'
import {
  appendLanguageLearningWords,
  setLanguageLearningWordMemorized,
} from '../../../../features/language-learning/word-storage'
import {afterEach, expect, it, vi} from 'vitest'
import {LanguageLearningWordList} from '../List'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
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

it('should display existing canonical spellings as distinct word rows', () => {
  const composedWord = {
    createdAt: '2026-09-06T00:00:00Z',
    language: 'ko' as const,
    memorized: false,
    value: '한글',
    version: 1 as const,
  }
  const decomposedWord = {
    ...composedWord,
    value: composedWord.value.normalize('NFD'),
  }
  const {container} = render(() => (
    <LanguageLearningWordList
      autoplayKey={() => null}
      getAudioUrl={() => null}
      isPronunciationLoading={() => false}
      onDelete={vi.fn()}
      onPronounce={vi.fn()}
      onToggleMemorized={vi.fn()}
      emptyMessage="단어 없음"
      onSelect={vi.fn()}
      selectedWords={() => []}
      words={[composedWord, decomposedWord]}
    />
  ))
  const wordButtons = [...container.querySelectorAll('ul button[aria-pressed]')]

  expect(wordButtons.map((button) => button.textContent)).toEqual([
    composedWord.value,
    decomposedWord.value,
  ])
  expect(wordButtons[0]).not.toBe(wordButtons[1])
})

it('should autoplay only the requested raw spelling when canonical equivalents coexist', () => {
  const playedWords: string[] = []
  const play = vi
    .spyOn(HTMLMediaElement.prototype, 'play')
    .mockImplementation(function recordPlayedWord(this: HTMLMediaElement) {
      const word = this.closest('li')?.querySelector('button[aria-pressed]')?.textContent
      if (word !== null && word !== undefined) {
        playedWords.push(word)
      }
      return Promise.resolve()
    })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const composedWord = {
    createdAt: '2026-09-06T00:00:00Z',
    language: 'ko' as const,
    memorized: false,
    value: '한글',
    version: 1 as const,
  }
  const decomposedWord = {
    ...composedWord,
    value: composedWord.value.normalize('NFD'),
  }
  render(() => (
    <LanguageLearningWordList
      autoplayKey={() => `ko:${decomposedWord.value}`}
      getAudioUrl={() => '/sample.opus'}
      isPronunciationLoading={() => false}
      onDelete={vi.fn()}
      onPronounce={vi.fn()}
      onToggleMemorized={vi.fn()}
      emptyMessage="단어 없음"
      onSelect={vi.fn()}
      selectedWords={() => []}
      words={[composedWord, decomposedWord]}
    />
  ))

  expect(play).toHaveBeenCalledOnce()
  expect(playedWords).toEqual([decomposedWord.value])
})

it('should preserve playing word audio and focus when another stored word changes', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  const options = {events: globalThis, storage: localStorage}
  appendLanguageLearningWords('en', ['apple', 'pear'], options)
  const onSelect = vi.fn()
  const View = () => {
    const words = useLanguageLearningWords(options)
    return (
      <LanguageLearningWordList
        words={words()}
        autoplayKey={() => 'en:apple'}
        getAudioUrl={() => '/sample.wav'}
        emptyMessage="단어 없음"
        isPronunciationLoading={() => false}
        onDelete={vi.fn()}
        onPronounce={vi.fn()}
        onSelect={onSelect}
        onToggleMemorized={vi.fn()}
        selectedWords={() => []}
      />
    )
  }
  render(() => <View />)
  const button = screen.getByRole('button', {name: 'apple'})
  const row = button.closest('li')!
  const audio = row.querySelector('audio')!
  const pause = vi.spyOn(audio, 'pause')
  expect(play).toHaveBeenCalledOnce()
  audio.currentTime = 0.5
  button.focus()
  setLanguageLearningWordMemorized({language: 'en', memorized: true, value: 'pear'}, options)
  expect(screen.getByRole('button', {name: 'apple'})).toBe(button)
  expect(button).toHaveFocus()
  expect(row.querySelector('audio')).toBe(audio)
  expect(audio.currentTime).toBe(0.5)
  expect(pause).not.toHaveBeenCalled()
  expect(play).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', {name: 'pear'}))
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({memorized: true, value: 'pear'}))
})
