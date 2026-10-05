/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {TarotSpeechController} from '../../../features/tarot/use-tarot-speech'
import {SpeechControls} from '../SpeechControls'

const [autoRead, setAutoRead] = createSignal(false)
const [audioUrl, setAudioUrl] = createSignal<string | null>(null)
const [status, setStatus] = createSignal<
  'consent' | 'downloading' | 'idle' | 'preparing' | 'ready' | 'error'
>('idle')
let speech: TarotSpeechController
const request = vi.fn()
const onPlaybackStart = vi.fn()
const onPlaybackEnd = vi.fn()
let play: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  setAutoRead(false)
  setAudioUrl(null)
  setStatus('idle')
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  speech = {
    audioUrl,
    autoplay: autoRead,
    autoRead,
    cancelDownload: vi.fn(),
    cancelDownloadConsent: vi.fn(),
    downloadSize: () => '200MB',
    error: () => null,
    onPlaybackEnd,
    onPlaybackError: vi.fn(),
    onPlaybackRequest: () => true,
    onPlaybackStart,
    paused: () => false,
    progress: () => null,
    request,
    setAutoRead,
    startDownload: vi.fn(),
    status,
  }
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should allow requesting speech before audio is prepared and retry voice failures', () => {
  render(() => <SpeechControls speech={speech} />)
  expect(screen.getByRole('button', {name: '해석 음성 재생'})).toBeEnabled()
  expect(screen.queryByRole('checkbox')).toBeNull()
  setStatus('error')
  fireEvent.click(screen.getByRole('button', {name: '해석 음성 재생'}))
  expect(request).toHaveBeenCalledOnce()
  setStatus('preparing')
  expect(screen.getByRole('button', {name: '음성을 준비하고 있어요'})).toBeDisabled()
})

it('should keep the loading indicator through text generation and voice preparation', () => {
  const [generating, setGenerating] = createSignal(true)
  render(() => <SpeechControls speech={speech} generating={generating()} />)
  const loading = screen.getByRole('button', {name: '카드를 해석하고 있어요…'})
  expect(loading).toBeDisabled()
  expect(loading.querySelector('span')).toHaveClass('i-tabler-loader-2', 'animate-spin')
  fireEvent.click(loading)
  expect(request).not.toHaveBeenCalled()
  setAudioUrl('blob:previous-reading')
  expect(screen.queryByRole('button', {name: '해석 음성 재생'})).not.toBeInTheDocument()
  expect(play).not.toHaveBeenCalled()
  setAudioUrl(null)
  setStatus('preparing')
  setGenerating(false)
  expect(screen.getByRole('button', {name: '음성을 준비하고 있어요'})).toBe(loading)
  expect(loading.querySelector('span')).toHaveClass('i-tabler-loader-2', 'animate-spin')
  setStatus('ready')
  setAudioUrl('blob:completed-reading')
  expect(screen.getByRole('button', {name: '해석 음성 재생'})).toBeEnabled()
})

it('should play prepared audio and forward native playback events', () => {
  setAudioUrl('blob:prepared-reading')
  const view = render(() => <SpeechControls speech={speech} />)
  expect(play).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: '해석 음성 재생'}))
  expect(play).toHaveBeenCalledOnce()
  const audio = view.container.querySelector('audio')!
  fireEvent.play(audio)
  expect(onPlaybackStart).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', {name: '해석 음성 일시정지'})).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  fireEvent.ended(audio)
  expect(onPlaybackEnd).toHaveBeenCalledOnce()
})

it('should start playback when prepared audio appears with automatic reading enabled', () => {
  setAutoRead(true)
  render(() => <SpeechControls speech={speech} />)
  expect(play).not.toHaveBeenCalled()
  setAudioUrl('blob:automatic-reading')
  expect(play).toHaveBeenCalledOnce()
})
