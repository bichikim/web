import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
import {encodeMonoPcm16Wav} from 'src/utils/encode-mono-pcm16-wav'
import type {LanguageLearningWord} from '../../../../features/language-learning/word-schema'
import {LanguageLearningWordList} from '../List'

const SAMPLE_RATE = 8000
const DURATION_SECONDS = 30

let audioUrl: string | undefined

afterEach(() => {
  cleanup()
  if (audioUrl !== undefined) {
    URL.revokeObjectURL(audioUrl)
    audioUrl = undefined
  }
})

it('should keep native playback when an equivalent stored row is removed', async () => {
  const word: LanguageLearningWord = {
    createdAt: '2026-09-03T00:00:00.000Z',
    language: 'ko',
    memorized: false,
    value: '한글',
    version: 1,
  }
  const otherWord = {...word, value: word.value.normalize('NFD')}
  const [words, setWords] = createSignal<ReadonlyArray<LanguageLearningWord>>([otherWord, word])
  const [autoplayKey, setAutoplayKey] = createSignal<string | null>(null)
  const wave = encodeMonoPcm16Wav(new Float32Array(SAMPLE_RATE * DURATION_SECONDS), SAMPLE_RATE)
  audioUrl = URL.createObjectURL(new Blob([wave], {type: 'audio/wav'}))
  const {container} = render(() =>
    createComponent(LanguageLearningWordList, {
      autoplayKey,
      emptyMessage: '단어 없음',
      getAudioUrl: () => audioUrl ?? null,
      isPronunciationLoading: () => false,
      onDelete: () => undefined,
      onPronounce: (requestedWord) => setAutoplayKey(`ko:${requestedWord.value}`),
      onSelect: () => undefined,
      onToggleMemorized: () => undefined,
      selectedWords: () => [],
      get words() {
        return words()
      },
    }),
  )
  const button = screen.getByRole('button', {name: word.value})
  const audio = button.closest('li')?.querySelector('audio')
  if (audio === null || audio === undefined) {
    throw new Error('단어의 발음 오디오가 없습니다.')
  }
  await expect.poll(() => audio.readyState).toBeGreaterThanOrEqual(2)
  const sourceMutations: MutationRecord[] = []
  const observer = new MutationObserver((records) => sourceMutations.push(...records))
  observer.observe(audio, {attributeFilter: ['src']})
  try {
    const pronounceButton = button
      .closest('li')
      ?.querySelector<HTMLButtonElement>('button[aria-busy]')
    if (pronounceButton === null || pronounceButton === undefined) {
      throw new Error('단어의 발음 버튼이 없습니다.')
    }
    await userEvent.click(pronounceButton)
    await expect.poll(() => audio.paused).toBe(false)
    await expect.poll(() => audio.currentTime).toBeGreaterThan(0)
    const position = audio.currentTime

    setWords([{...word}])

    await expect.poll(() => container.querySelectorAll('li').length).toBe(1)
    expect(button.closest('li')?.querySelector('audio')).toBe(audio)
    expect(audio.paused).toBe(false)
    expect(audio.currentTime).toBeGreaterThanOrEqual(position)
    expect(sourceMutations).toHaveLength(0)
  } finally {
    observer.disconnect()
  }
})
