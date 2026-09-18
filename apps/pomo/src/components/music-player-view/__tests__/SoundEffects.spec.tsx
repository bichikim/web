/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {
  type SoundEffect,
  type SoundEffectPlayback,
  SoundEffectsContext,
  type SoundEffectsController,
} from '../../../features/sound-effects'
import {SoundEffects} from '../SoundEffects'

vi.mock('../../p-modal/PModal', () => ({
  PModal: (props: {readonly children: JSX.Element; readonly headerActions?: JSX.Element}) => (
    <>
      {props.headerActions}
      {props.children}
    </>
  ),
}))

vi.mock('../../p-player-utility-button/PPlayerUtilityButton', () => ({
  PPlayerUtilityButton: (props: {
    readonly accessibleLabel: string
    readonly onPress: (source: HTMLButtonElement) => void
  }) => {
    const handleClick = (event: MouseEvent & {readonly currentTarget: HTMLButtonElement}) =>
      props.onPress(event.currentTarget)

    return <button aria-label={props.accessibleLabel} onClick={handleClick} type="button" />
  },
}))

vi.mock('../SoundEffectControl', () => ({
  SoundEffectControl: (props: {readonly effect: SoundEffect}) => (
    <span>{props.effect.title.ko}</span>
  ),
}))

const EFFECTS: readonly SoundEffect[] = [
  {
    artworkUrl: '/audio/artwork/waves.png',
    durationSeconds: 300,
    id: 'waves',
    source: '/audio/sound-effects/waves.mp3',
    title: {en: 'Waves', ko: '파도 소리'},
  },
  {
    artworkUrl: '/audio/artwork/rain.png',
    durationSeconds: 300,
    id: 'rain',
    source: '/audio/sound-effects/rain.mp3',
    title: {en: 'Rain', ko: '비 소리'},
  },
  {
    artworkUrl: '/audio/artwork/thunder.png',
    durationSeconds: 300,
    id: 'thunder',
    source: '/audio/sound-effects/thunder.mp3',
    title: {en: 'Thunder', ko: '천둥 소리'},
  },
]

const playback: SoundEffectPlayback = {
  activate: () => undefined,
  error: () => null,
  playing: () => false,
  ready: () => true,
  setVolume: () => undefined,
  stop: () => undefined,
  volume: () => 0.4,
}

const [isStopped, setIsStopped] = createSignal(false)
const activateAll = vi.fn(() => setIsStopped(false))
const stopAll = vi.fn(() => setIsStopped(true))
const controller: SoundEffectsController = {
  activate: activateAll,
  effects: () => EFFECTS,
  getPlayback: () => playback,
  isStopped,
  status: () => 'ready',
  stop: stopAll,
}

afterEach(() => {
  cleanup()
  setIsStopped(false)
  activateAll.mockClear()
  stopAll.mockClear()
})

it('should omit the sound effect control when its provider is unavailable', () => {
  render(() => <SoundEffects />)

  expect(screen.queryByRole('button', {name: '효과음'})).not.toBeInTheDocument()
})

it('should render the sound effect control when its provider is available', () => {
  render(() => (
    <SoundEffectsContext.Provider value={controller}>
      <SoundEffects />
    </SoundEffectsContext.Provider>
  ))

  expect(screen.getByRole('button', {name: '효과음'})).toBeInTheDocument()
})

it('should arrange sound effect controls from left to right and wrap when needed', async () => {
  render(() => (
    <SoundEffectsContext.Provider value={controller}>
      <SoundEffects />
    </SoundEffectsContext.Provider>
  ))

  fireEvent.click(screen.getByRole('button', {name: '효과음'}))

  const effectList = await screen.findByRole('list', {name: '효과음'})

  expect(effectList).toHaveClass('flex', 'flex-wrap', 'justify-start')
})

it('should toggle every sound effect from the modal action', () => {
  render(() => (
    <SoundEffectsContext.Provider value={controller}>
      <SoundEffects />
    </SoundEffectsContext.Provider>
  ))

  fireEvent.click(screen.getByRole('button', {name: '효과음'}))
  fireEvent.click(screen.getByRole('button', {name: '모두 끄기'}))

  expect(stopAll).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', {name: '모두 켜기'})).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '모두 켜기'}))

  expect(activateAll).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', {name: '모두 끄기'})).toBeInTheDocument()
})
