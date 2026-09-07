/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useAudioPlayer} from '../../audio-player'
import {MuteIcon} from '../MuteIcon'
vi.mock('../../audio-player', () => ({useAudioPlayer: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should update the icon when audio muted changes', () => {
  const [state, setState] = createSignal({muted: true})
  vi.mocked(useAudioPlayer).mockReturnValue([state] as unknown as ReturnType<typeof useAudioPlayer>)
  const view = render(() => <MuteIcon />)
  expect(view.container.firstElementChild).toHaveClass('i-tabler-volume-off')
  expect(view.container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  setState({muted: false})
  expect(view.container.firstElementChild).toHaveClass('i-tabler-volume')
})
