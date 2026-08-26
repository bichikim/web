import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@paraglide/message', () => ({
  album_preview_failed: () => 'preview failed',
  album_preview_login_required: () => 'login required',
}))

import {useTrackPreview} from '../use-track-preview'

const createAudio = () =>
  ({
    currentTime: 4,
    error: {code: 3},
    load: vi.fn(),
    networkState: 2,
    pause: vi.fn(),
    play: vi.fn(async () => undefined),
    readyState: 4,
    removeAttribute: vi.fn(),
    src: '',
  }) as unknown as HTMLAudioElement

const createPreview = (options: Parameters<typeof useTrackPreview>[0] = {}) => {
  let dispose: () => void = () => undefined
  const preview = createRoot((rootDispose) => {
    dispose = rootDispose
    return useTrackPreview(options)
  })
  return {dispose, preview}
}

afterEach(() => {
  vi.restoreAllMocks()
})

it('should play, toggle, end, and clean up a static preview session', async () => {
  const onEnd = vi.fn()
  const onStart = vi.fn()
  const audio = createAudio()
  const {dispose, preview} = createPreview({onEnd, onStart})
  preview.setAudioElement(audio)

  await preview.togglePreview({id: 'track', source: '/preview.mp3'})
  expect(audio.src).toBe('/preview.mp3')
  expect(preview.pendingTrackId()).toBeNull()
  expect(preview.playingTrackId()).toBe('track')
  expect(onStart).toHaveBeenCalledWith(expect.any(Function))

  await preview.togglePreview({id: 'other', source: '/other.mp3'})
  expect(onStart).toHaveBeenCalledOnce()

  await preview.togglePreview({id: 'other', source: '/other.mp3'})
  expect(preview.playingTrackId()).toBeNull()
  expect(onEnd).toHaveBeenCalledOnce()
  await preview.togglePreview({id: 'track', source: '/preview.mp3'})
  preview.handleEnded()
  dispose()
  expect(onEnd).toHaveBeenCalledTimes(2)
})

it('should not mark a preview ready after playback is stopped while play is pending', async () => {
  let resolvePlay: () => void = () => undefined
  const audio = createAudio()
  vi.mocked(audio.play).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolvePlay = resolve
    }),
  )
  const {dispose, preview} = createPreview()
  preview.setAudioElement(audio)
  const pending = preview.togglePreview({id: 'track', source: '/preview.mp3'})

  preview.handleEnded()
  resolvePlay()
  await pending

  expect(preview.pendingTrackId()).toBeNull()
  dispose()
})

it('should ignore preview requests before the audio element is assigned', async () => {
  const {dispose, preview} = createPreview()

  await preview.togglePreview({id: 'track', source: '/preview.mp3'})
  preview.handleError()

  expect(preview.playingTrackId()).toBeNull()
  dispose()
})

it('should show the login message for an inaccessible resolved preview', async () => {
  const {dispose, preview} = createPreview()
  preview.setAudioElement(createAudio())

  await preview.togglePreview({
    id: 'private',
    loadSource: vi.fn(async () => ({ok: false, reason: 'authentication-required'}) as const),
  })

  expect(preview.errorMessage()).toBe('login required')
  expect(preview.playingTrackId()).toBeNull()
  dispose()
})

it('should release a stale resolved source without starting it', async () => {
  let resolveSource: (value: {ok: true; release: () => void; source: string}) => void = () =>
    undefined
  const release = vi.fn()
  const {dispose, preview} = createPreview()
  preview.setAudioElement(createAudio())
  const pending = preview.togglePreview({
    id: 'remote',
    loadSource: () =>
      new Promise((resolve) => {
        resolveSource = resolve
      }),
  })

  preview.handleEnded()
  resolveSource({ok: true, release, source: 'blob:preview'})
  await pending

  expect(release).toHaveBeenCalledOnce()
  dispose()
})

it('should ignore a stale source failure and report a current playback failure', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  let rejectSource: (error: Error) => void = () => undefined
  const audio = createAudio()
  const {dispose, preview} = createPreview()
  preview.setAudioElement(audio)
  const stale = preview.togglePreview({
    id: 'stale',
    loadSource: () =>
      new Promise((_, reject) => {
        rejectSource = reject
      }),
  })
  preview.handleEnded()
  rejectSource(new Error('stale'))
  await stale
  expect(consoleError).not.toHaveBeenCalled()

  vi.mocked(audio.play).mockRejectedValueOnce(new Error('blocked'))
  await preview.togglePreview({id: 'current', source: '/preview.mp3'})
  expect(preview.errorMessage()).toBe('preview failed')
  expect(consoleError).toHaveBeenCalled()
  dispose()
})

it('should release successful sources and report active media errors', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const release = vi.fn()
  const audio = createAudio()
  const {dispose, preview} = createPreview()
  preview.setAudioElement(audio)
  await preview.togglePreview({
    id: 'remote',
    loadSource: vi.fn(async () => ({ok: true as const, release, source: 'blob:preview'})),
  })

  preview.handleError()

  expect(release).toHaveBeenCalledOnce()
  expect(preview.errorMessage()).toBe('preview failed')
  expect(consoleError).toHaveBeenCalledWith(
    'Album track preview media failed.',
    expect.stringContaining('"errorCode":3'),
  )
  dispose()
})

it('should report null media diagnostics when the audio element exposes none', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const audio = {
    currentTime: 0,
    load: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(async () => undefined),
    removeAttribute: vi.fn(),
    src: '',
  } as unknown as HTMLAudioElement
  const {dispose, preview} = createPreview()
  preview.setAudioElement(audio)
  await preview.togglePreview({id: 'track', source: '/preview.mp3'})

  preview.handleError()

  expect(consoleError).toHaveBeenCalledWith(
    'Album track preview media failed.',
    '{"errorCode":null,"networkState":null,"readyState":null}',
  )
  dispose()
})
