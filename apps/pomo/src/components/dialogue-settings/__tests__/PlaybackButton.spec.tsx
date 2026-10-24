/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {DialoguePlaybackButton} from '../PlaybackButton'

afterEach(cleanup)

it('should render an inactive listener when playback props are omitted', () => {
  const result = render(() => <DialoguePlaybackButton />)
  const button = result.getByRole('button', {name: '듣기'})
  const icon = button.querySelector('[aria-hidden="true"]')

  expect(button.getAttribute('aria-pressed')).toBe('false')
  expect(icon?.classList.contains('i-tabler-player-play')).toBe(true)
  expect(() => fireEvent.click(button)).not.toThrow()
})

it('should stop active playback through the supplied press handler', () => {
  const onPress = vi.fn()
  const result = render(() => <DialoguePlaybackButton isPlaying onPress={onPress} />)
  const button = result.getByRole('button', {name: '중지'})
  const icon = button.querySelector('[aria-hidden="true"]')

  expect(button.getAttribute('aria-pressed')).toBe('true')
  expect(icon?.classList.contains('i-tabler-player-stop')).toBe(true)

  fireEvent.click(button)

  expect(onPress).toHaveBeenCalledOnce()
})
