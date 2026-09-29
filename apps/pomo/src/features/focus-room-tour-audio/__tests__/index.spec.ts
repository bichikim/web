/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createFocusRoomTourAudioPlayer, type FocusRoomTourAudioRuntime} from '../index'

interface TestAudio {
  readonly currentTime: number
  readonly load: ReturnType<typeof vi.fn>
  readonly pause: ReturnType<typeof vi.fn>
  readonly play: ReturnType<typeof vi.fn>
  readonly removeAttribute: ReturnType<typeof vi.fn>
}

const createAudio = (): TestAudio => ({
  currentTime: 0,
  load: vi.fn(),
  pause: vi.fn(),
  play: vi.fn().mockResolvedValue(undefined),
  removeAttribute: vi.fn(),
})

const createPendingAudioPlay = () => {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((resolvePromise) => {
    resolve = () => resolvePromise()
  })

  return {promise, resolve}
}

const createRuntime = () => {
  const audios: TestAudio[] = []
  const runtime: FocusRoomTourAudioRuntime = {
    createAudio: vi.fn(() => {
      const audio = createAudio()
      audios.push(audio)
      return audio as unknown as HTMLAudioElement
    }),
  }
  return {audios, runtime}
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createFocusRoomTourAudioPlayer', () => {
  it('should play one bundled narration at a time', () => {
    const {audios, runtime} = createRuntime()
    const player = createFocusRoomTourAudioPlayer(runtime)

    player.play('/tour/audio/ko/pomodoro.mp3')
    player.play('/tour/audio/ko/music.mp3')

    expect(runtime.createAudio).toHaveBeenNthCalledWith(1, '/tour/audio/ko/pomodoro.mp3')
    expect(runtime.createAudio).toHaveBeenNthCalledWith(2, '/tour/audio/ko/music.mp3')
    expect(audios[0]?.pause).toHaveBeenCalledOnce()
    expect(audios[0]?.removeAttribute).toHaveBeenCalledWith('src')
    expect(audios[0]?.load).toHaveBeenCalledOnce()
    expect(audios[1]?.play).toHaveBeenCalledOnce()
  })

  it('should stop and dispose the active narration', () => {
    const {audios, runtime} = createRuntime()
    const player = createFocusRoomTourAudioPlayer(runtime)

    player.play('/tour/audio/ko/settings.mp3')
    player.stop()
    player.dispose()

    expect(audios[0]?.pause).toHaveBeenCalledOnce()
    expect(audios[0]?.removeAttribute).toHaveBeenCalledWith('src')
    expect(audios[0]?.load).toHaveBeenCalledOnce()
  })

  it('should stop narration when pending playback resolves after stop', async () => {
    const {audios, runtime} = createRuntime()
    const audio = createAudio()
    const pendingPlay = createPendingAudioPlay()
    audio.play.mockReturnValueOnce(pendingPlay.promise)
    audios.push(audio)
    vi.mocked(runtime.createAudio).mockReturnValueOnce(audio as unknown as HTMLAudioElement)
    const player = createFocusRoomTourAudioPlayer(runtime)

    player.play('/tour/audio/ko/pomodoro.mp3')
    player.stop()
    pendingPlay.resolve()
    await pendingPlay.promise

    expect(audio.pause).toHaveBeenCalledTimes(2)
    expect(audio.removeAttribute).toHaveBeenCalledTimes(2)
    expect(audio.load).toHaveBeenCalledTimes(2)
  })

  it('should stop stale narration when pending playback resolves after switching steps', async () => {
    const {audios, runtime} = createRuntime()
    const previousAudio = createAudio()
    const currentAudio = createAudio()
    const pendingPlay = createPendingAudioPlay()
    previousAudio.play.mockReturnValueOnce(pendingPlay.promise)
    audios.push(previousAudio, currentAudio)
    vi.mocked(runtime.createAudio)
      .mockReturnValueOnce(previousAudio as unknown as HTMLAudioElement)
      .mockReturnValueOnce(currentAudio as unknown as HTMLAudioElement)
    const player = createFocusRoomTourAudioPlayer(runtime)

    player.play('/tour/audio/ko/pomodoro.mp3')
    player.play('/tour/audio/ko/music.mp3')
    pendingPlay.resolve()
    await pendingPlay.promise

    expect(previousAudio.pause).toHaveBeenCalledTimes(2)
    expect(previousAudio.removeAttribute).toHaveBeenCalledTimes(2)
    expect(previousAudio.load).toHaveBeenCalledTimes(2)
    expect(currentAudio.play).toHaveBeenCalledOnce()
    expect(currentAudio.pause).not.toHaveBeenCalled()
  })

  it('should absorb browser playback rejection', async () => {
    const {audios, runtime} = createRuntime()
    audios.push(createAudio())
    vi.mocked(runtime.createAudio).mockReturnValueOnce(audios[0] as unknown as HTMLAudioElement)
    audios[0]!.play.mockRejectedValueOnce(new Error('autoplay blocked'))
    const player = createFocusRoomTourAudioPlayer(runtime)

    expect(() => player.play('/tour/audio/ko/pomodoro.mp3')).not.toThrow()
    await Promise.resolve()
    expect(audios[0]?.play).toHaveBeenCalledOnce()
    expect(audios[0]?.pause).toHaveBeenCalledOnce()
    expect(audios[0]?.removeAttribute).toHaveBeenCalledWith('src')
    expect(audios[0]?.load).toHaveBeenCalledOnce()
  })
})
