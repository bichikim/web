/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {MediaPlayer} from '../index'

vi.mock('media-chrome', () => ({}))
vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}))
const TRACKS = [
  {artist: 'Pomo', durationSeconds: 120, id: 'rain', source: '/rain.wav', title: 'Rain'},
  {artist: 'Pomo', durationSeconds: 120, id: 'forest', source: '/forest.wav', title: 'Forest'},
] as const
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(Math, 'random').mockReturnValue(0.99)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})
afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, 'mediaSession')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should publish playback, time, duration, volume and errors without exposing the audio node', () => {
  const onPlayingChange = vi.fn()
  const onTrackChange = vi.fn()
  const onTimeUpdate = vi.fn()
  const onDurationChange = vi.fn()
  const onVolumeChange = vi.fn()
  const onError = vi.fn()
  const result = render(() => (
    <MediaPlayer
      tracks={TRACKS}
      onPlayingChange={onPlayingChange}
      onTrackChange={onTrackChange}
      onTimeUpdate={onTimeUpdate}
      onDurationChange={onDurationChange}
      onVolumeChange={onVolumeChange}
      onError={onError}
    >
      <media-play-button />
    </MediaPlayer>
  ))
  const audio = result.container.querySelector('audio')!
  expect(audio.parentElement?.tagName).toBe('MEDIA-CONTROLLER')
  expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[0])
  expect(onPlayingChange).toHaveBeenLastCalledWith(false)
  fireEvent.play(audio)
  expect(onPlayingChange).toHaveBeenLastCalledWith(true)
  fireEvent.pause(audio)
  expect(onPlayingChange).toHaveBeenLastCalledWith(false)
  Object.defineProperty(audio, 'duration', {configurable: true, value: 120})
  audio.currentTime = 17
  fireEvent.timeUpdate(audio)
  expect(onTimeUpdate).toHaveBeenLastCalledWith({currentTime: 17, duration: 120})
  fireEvent.durationChange(audio)
  expect(onDurationChange).toHaveBeenLastCalledWith(120)
  audio.volume = 0.4
  audio.muted = true
  fireEvent.volumeChange(audio)
  expect(onVolumeChange).toHaveBeenLastCalledWith({muted: true, volume: 0.4})
  const failure = {code: 4, message: 'Unsupported source'}
  Object.defineProperty(audio, 'error', {value: failure})
  fireEvent.error(audio)
  expect(onError).toHaveBeenLastCalledWith(failure)
})

it('should select the next track internally on end and device requests and release device handlers', async () => {
  const handlers = new Map<string, MediaSessionActionHandler | null>()
  const session = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: (action: string, handler: MediaSessionActionHandler | null) =>
      handlers.set(action, handler),
  }
  Object.defineProperty(navigator, 'mediaSession', {configurable: true, value: session})
  vi.stubGlobal(
    'MediaMetadata',
    class {
      constructor(data: MediaMetadataInit) {
        Object.assign(this, data)
      }
    },
  )
  const onEnded = vi.fn()
  const onError = vi.fn()
  const onTrackChange = vi.fn()
  const result = render(() => (
    <MediaPlayer
      tracks={TRACKS}
      onEnded={onEnded}
      onTrackChange={onTrackChange}
      onError={onError}
    />
  ))
  const audio = result.container.querySelector('audio')!
  Object.defineProperty(audio, 'readyState', {value: HTMLMediaElement.HAVE_METADATA})
  await Promise.resolve()
  expect(session.metadata).toMatchObject({title: 'Rain'})
  fireEvent.ended(audio)
  expect(onEnded).toHaveBeenLastCalledWith(TRACKS[0])
  expect(audio.getAttribute('src')).toBe('/forest.wav')
  expect(session.metadata).toMatchObject({title: 'Forest'})
  handlers.get('previoustrack')?.({action: 'previoustrack'})
  expect(audio.getAttribute('src')).toBe('/rain.wav')
  handlers.get('nexttrack')?.({action: 'nexttrack'})
  expect(audio.getAttribute('src')).toBe('/forest.wav')
  expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[1])
  const failure = new Error('Playback denied')
  vi.mocked(audio.play).mockRejectedValueOnce(failure)
  await Promise.resolve()
  handlers.get('play')?.({action: 'play'})
  await Promise.resolve()
  expect(onError).toHaveBeenLastCalledWith(failure)
  fireEvent.play(audio)
  expect(session.playbackState).toBe('playing')
  handlers.get('pause')?.({action: 'pause'})
  expect(audio.pause).toHaveBeenCalled()
  result.unmount()
  expect(session.metadata).toBeNull()
  expect([...handlers.values()]).toEqual([null, null, null, null])
})
