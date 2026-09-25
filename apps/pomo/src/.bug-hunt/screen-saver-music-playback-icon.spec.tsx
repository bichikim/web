/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {PScreenSaver} from '../components/p-screen-saver/PScreenSaver'

const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
  this.open = true
})
const close = vi.fn(function close(this: HTMLDialogElement) {
  this.open = false
})

beforeEach(() => {
  vi.clearAllMocks()
  HTMLDialogElement.prototype.showModal = showModal
  HTMLDialogElement.prototype.close = close
})

describe('screen saver music playback icon', () => {
  it('should show pause while music is playing and play while paused', () => {
    const [isMusicPlaying, setIsMusicPlaying] = createSignal(true)
    render(() => (
      <PScreenSaver
        isActive={true}
        isMusicPlaying={isMusicPlaying()}
        track={{artist: 'rainymonday', title: 'Sunday Morning Coffee'}}
      />
    ))

    const trackRegion = screen.getByRole('region', {name: '현재 음악'})
    const playbackIcon = trackRegion.querySelector('p > span[aria-hidden="true"]')

    expect(trackRegion.textContent).toContain('음악 재생 중')
    expect(playbackIcon?.classList).toContain('i-tabler-player-pause')
    expect(playbackIcon?.classList).not.toContain('i-tabler-player-play')

    setIsMusicPlaying(false)
    expect(trackRegion.textContent).toContain('음악 일시 정지')
    expect(playbackIcon?.classList).toContain('i-tabler-player-play')
    expect(playbackIcon?.classList).not.toContain('i-tabler-player-pause')
  })
})
