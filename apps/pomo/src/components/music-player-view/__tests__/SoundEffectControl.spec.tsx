/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {
  type SoundEffect,
  SoundEffectsContext,
  type SoundEffectsController,
} from '../../../features/sound-effects'
import {SoundEffectControl} from '../SoundEffectControl'

const playback = vi.hoisted(() => ({
  activate: vi.fn(),
  error: () => null,
  playing: vi.fn(() => false),
  ready: () => true,
  setVolume: vi.fn(),
  volume: () => 0.25,
}))

const EFFECT: SoundEffect = {
  artworkUrl: '/audio/artwork/waves.png',
  durationSeconds: 300,
  id: 'waves',
  source: 'https://storage.pomofi.io/sound-effects/waves.mp3',
  title: {en: 'Waves', ko: '파도 소리'},
}

const controller: SoundEffectsController = {
  activate: vi.fn(),
  effects: () => [EFFECT],
  getPlayback: () => playback,
  status: () => 'ready',
}

const renderControl = () =>
  render(() => (
    <SoundEffectsContext.Provider value={controller}>
      <SoundEffectControl effect={EFFECT} />
    </SoundEffectsContext.Provider>
  ))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  playback.playing.mockReturnValue(false)
})

it('should activate the global playback controller when it mounts', () => {
  renderControl()

  expect(playback.activate).toHaveBeenCalledOnce()
})

it('should turn vertical dragging into an accessible volume change', () => {
  const view = renderControl()
  const control = view.getByRole('slider')

  fireEvent(control, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientY: 200}))
  fireEvent(control, new MouseEvent('pointermove', {bubbles: true, clientY: 140}))
  fireEvent(control, new MouseEvent('pointerup', {bubbles: true, clientY: 140}))

  expect(playback.setVolume).toHaveBeenLastCalledWith(0.75)
})

it('should show the current percentage inside the circular control', () => {
  const view = renderControl()
  const control = view.getByRole('slider')

  expect(control).toHaveTextContent('25%')
})

it('should halve the circular control at the mobile breakpoint', () => {
  const view = renderControl()
  const control = view.getByRole('slider')

  expect(control).toHaveClass('size-28', 'max-md:size-14')
})

it('should prevent the artwork from becoming a native drag target', () => {
  const view = renderControl()
  const artwork = view.getByRole('slider').querySelector('img')

  expect(artwork).toHaveAttribute('draggable', 'false')
  expect(artwork).toHaveClass('pointer-events-none')
})

it('should not render a speaker icon over the artwork', () => {
  playback.playing.mockReturnValue(true)
  const view = renderControl()

  expect(view.getByRole('slider').querySelector('.i-tabler-volume-2')).toBeNull()
})

it('should expose arrow-key volume controls without toggling on click', () => {
  const view = renderControl()
  const control = view.getByRole('slider')

  fireEvent.keyDown(control, {key: 'ArrowDown'})
  expect(playback.setVolume).toHaveBeenLastCalledWith(0.2)

  playback.setVolume.mockClear()
  fireEvent.click(control)
  expect(playback.setVolume).not.toHaveBeenCalled()
})
