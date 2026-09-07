/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {LanguageLearningWordPronunciationButton} from '../PronunciationButton'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should report rejected autoplay and pause audio on disposal', async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('blocked'))
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const view = render(() => (
    <LanguageLearningWordPronunciationButton
      autoplay
      disabled={false}
      loading={false}
      onPress={vi.fn()}
      src="/apple.mp3"
      word="apple"
    />
  ))
  expect(play).toHaveBeenCalledOnce()
  expect(
    await screen.findByRole('button', {name: m.learning_words_playback_failed({word: 'apple'})}),
  ).toBeVisible()
  view.unmount()
  expect(pause).toHaveBeenCalledOnce()
})
it('should request pronunciation and expose loading state', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const onPress = vi.fn()
  const [loading, setLoading] = createSignal(false)
  render(() => (
    <LanguageLearningWordPronunciationButton
      autoplay={false}
      disabled={loading()}
      loading={loading()}
      onPress={onPress}
      src={null}
      word="apple"
    />
  ))
  fireEvent.click(screen.getByRole('button'))
  expect(onPress).toHaveBeenCalledOnce()
  setLoading(true)
  expect(screen.getByRole('button')).toBeDisabled()
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
})
