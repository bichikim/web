/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useAudioPlayer} from '../../audio-player'
import {PlaybackIcon} from '../PlaybackIcon'
vi.mock('../../audio-player', () => ({useAudioPlayer: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should update the icon when audio paused changes', () => {
  const [state, setState] = createSignal({paused: true})
  vi.mocked(useAudioPlayer).mockReturnValue([state] as unknown as ReturnType<typeof useAudioPlayer>)
  const view = render(() => <PlaybackIcon />)
  expect(view.container.firstElementChild).toHaveClass('i-tabler-player-play')
  expect(view.container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  setState({paused: false})
  expect(view.container.firstElementChild).toHaveClass('i-tabler-player-pause')
})
