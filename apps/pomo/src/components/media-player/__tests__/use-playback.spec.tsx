/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {type Playback, usePlayback} from '../use-playback'

afterEach(cleanup)

it('should ignore a rejected old play request after a new request or pause', async () => {
  let playback: Playback | undefined
  const onError = vi.fn()
  const [element, setElement] = createSignal<HTMLAudioElement>()
  render(() => {
    playback = usePlayback({element, onError})
    return null
  })
  if (!playback) {
    throw new Error('Missing playback')
  }
  const audio = document.createElement('audio')
  let rejectOld: ((error: Error) => void) | undefined
  vi.spyOn(audio, 'play')
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject
        }),
    )
    .mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)
  playback.play()
  playback.play()
  playback.onPlay()
  rejectOld?.(new Error('Old source failed'))
  await Promise.resolve()
  expect(playback.isPlaying()).toBe(true)
  expect(onError).not.toHaveBeenCalled()
  vi.mocked(audio.play).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectOld = reject
      }),
  )
  playback.play()
  playback.pause()
  playback.onPause()
  rejectOld?.(new Error('Cancelled playback'))
  await Promise.resolve()
  expect(playback.isPlaying()).toBe(false)
  expect(onError).not.toHaveBeenCalled()
  playback.seek(12)
  expect(audio.currentTime).toBe(12)
  vi.mocked(audio.play).mockRejectedValueOnce(new Error('Current source failed'))
  playback.play()
  await Promise.resolve()
  expect(onError).toHaveBeenCalledOnce()
})

it('should ignore a late play event after cancelling a pending play request', () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let playback: Playback | undefined
  render(() => {
    playback = usePlayback({element})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }

  const audio = document.createElement('audio')
  vi.spyOn(audio, 'play').mockResolvedValue()
  const pause = vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)

  playback.play()
  playback.cancelPendingPlay()
  playback.onPlay()

  expect(playback.isPlaying()).toBe(false)
  expect(pause).toHaveBeenCalledOnce()
})

it('should ignore a late play event after an external pause', () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let playback: Playback | undefined
  render(() => {
    playback = usePlayback({element})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }

  const audio = document.createElement('audio')
  vi.spyOn(audio, 'play').mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)

  playback.play()
  playback.onPause()
  playback.onPlay()

  expect(playback.isPlaying()).toBe(false)
})

it('should keep a cancelled play event separate from a later play request', () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let playback: Playback | undefined
  render(() => {
    playback = usePlayback({element})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }

  const audio = document.createElement('audio')
  vi.spyOn(audio, 'play').mockResolvedValue()
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)

  playback.play()
  playback.cancelPendingPlay()
  playback.play()
  playback.onPlay()
  expect(playback.isPlaying()).toBe(false)

  Object.defineProperty(audio, 'paused', {configurable: true, value: false})
  playback.onPlay()
  expect(playback.isPlaying()).toBe(true)
})

it('should preserve playback through the native pause caused by a track change', () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  const [pauseProtected, setPauseProtected] = createSignal(false)
  let playback: Playback | undefined
  render(() => {
    playback = usePlayback({element, shouldIgnoreNativePause: pauseProtected})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }

  const audio = document.createElement('audio')
  const pause = vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  vi.spyOn(audio, 'play').mockResolvedValue()
  setElement(audio)

  playback.onPlay()
  setPauseProtected(true)
  playback.play()
  playback.onPause()

  expect(playback.isPlaying()).toBe(true)
  expect(pause).not.toHaveBeenCalled()
})

it('should mark playback paused before the native pause event arrives', () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let playback: Playback | undefined
  render(() => {
    playback = usePlayback({element})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }

  const audio = document.createElement('audio')
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)

  playback.onPlay()
  playback.pause()

  expect(playback.isPlaying()).toBe(false)
})

it('should apply a media-controller pause intent before the native pause event arrives', () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let playback: Playback | undefined
  render(() => {
    playback = usePlayback({element})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }

  const audio = document.createElement('audio')
  setElement(audio)
  playback.onPlay()
  playback.markPauseIntent()

  expect(playback.isPlaying()).toBe(false)
})

it('should read the current element from the input accessor for each command', async () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  let playback: Playback | undefined
  const onError = vi.fn()
  const result = render(() => {
    playback = usePlayback({element, onError})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }
  playback.play()
  playback.pause()
  playback.seek(10)
  const first = document.createElement('audio')
  const second = document.createElement('audio')
  let rejectFirst: ((reason: Error) => void) | undefined
  vi.spyOn(first, 'play').mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectFirst = reject
      }),
  )
  const playSecond = vi.spyOn(second, 'play').mockResolvedValue()
  const pauseSecond = vi.spyOn(second, 'pause').mockImplementation(() => undefined)
  setElement(first)
  playback.play()
  setElement(second)
  rejectFirst?.(new Error('Detached element failed'))
  await Promise.resolve()
  expect(onError).not.toHaveBeenCalled()
  playback.play()
  playback.seek(7)
  playback.pause()
  expect(playSecond).toHaveBeenCalledOnce()
  expect(second.currentTime).toBe(7)
  expect(first.currentTime).toBe(0)
  expect(pauseSecond).toHaveBeenCalledOnce()
  result.unmount()
  expect(pauseSecond).toHaveBeenCalledTimes(2)
})

it('should report whether a pause came from an explicit playback command', () => {
  const [element, setElement] = createSignal<HTMLAudioElement>()
  const onPause = vi.fn()
  let playback: Playback | undefined
  render(() => {
    playback = usePlayback({element, onPause})
    return null
  })
  if (playback === undefined) {
    throw new Error('Missing playback')
  }

  const audio = document.createElement('audio')
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  setElement(audio)
  playback.onPlay()
  playback.pause({isUserIntent: false})
  playback.onPause()
  expect(onPause).toHaveBeenLastCalledWith(true, false)

  playback.onPlay()
  playback.pause()
  playback.onPause()
  expect(onPause).toHaveBeenLastCalledWith(true, true)

  playback.onPlay()
  playback.markPauseIntent()
  playback.onPause()
  expect(onPause).toHaveBeenLastCalledWith(true, true)
})
