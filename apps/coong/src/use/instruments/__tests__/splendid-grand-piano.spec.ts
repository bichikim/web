/** @vitest-environment jsdom */

import {useIsCleanup} from '@winter-love/solid-use'
import {getWindow} from '@winter-love/utils'
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getAudioContext, prepareAudioContext} from '../prepare-audio-context'
import {
  CHANNEL_NAME_KEY,
  createSplendidGrandPianoExtended,
  type ExtendedSampleStart,
  ORIGINAL_NOTE_KEY,
  type SplendidGrandPianoExtended,
  USER_PLAY_FLAG_KEY,
} from '../splendid-grand-piano-extended'
import {createSplendidGrandPiano} from '../splendid-grand-piano'

vi.mock('@winter-love/solid-use', () => ({
  useIsCleanup: vi.fn(),
}))

vi.mock('@winter-love/utils', () => ({
  getWindow: vi.fn(),
}))

vi.mock('../prepare-audio-context', () => ({
  getAudioContext: vi.fn(),
  prepareAudioContext: vi.fn(),
}))

vi.mock('../splendid-grand-piano-extended', async () => {
  const actual = await vi.importActual<typeof import('../splendid-grand-piano-extended')>(
    '../splendid-grand-piano-extended',
  )

  return {
    ...actual,
    createSplendidGrandPianoExtended: vi.fn(),
  }
})

interface PianoFixture {
  down: ReturnType<typeof vi.fn>
  getLeftTime: ReturnType<typeof vi.fn>
  getPlayedTime: ReturnType<typeof vi.fn>
  load: Promise<void>
  play: ReturnType<typeof vi.fn>
  resolveLoad: () => void
  resume: ReturnType<typeof vi.fn>
  seek: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  suspend: ReturnType<typeof vi.fn>
  up: ReturnType<typeof vi.fn>
}

const createPianoFixture = (): PianoFixture => {
  let resolveLoad = () => {
    //
  }
  const load = new Promise<void>((resolve) => {
    resolveLoad = resolve
  })

  return {
    down: vi.fn().mockReturnValue(vi.fn()),
    getLeftTime: vi.fn().mockReturnValue(7),
    getPlayedTime: vi.fn().mockReturnValue(3),
    load,
    play: vi.fn(),
    resolveLoad,
    resume: vi.fn(),
    seek: vi.fn(),
    stop: vi.fn(),
    suspend: vi.fn(),
    up: vi.fn(),
  }
}

const createAudioContextFixture = () => {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    state: 'running',
  } as unknown as AudioContext
}

const createPianoRoot = () => {
  return createRoot((dispose) => {
    const [state, controller] = createSplendidGrandPiano()

    return {controller, dispose, state}
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  vi.mocked(getWindow).mockReturnValue(window)
  vi.mocked(useIsCleanup).mockReturnValue(() => false)
  vi.mocked(prepareAudioContext).mockReturnValue(vi.fn())
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('createSplendidGrandPiano', () => {
  it('should initialize, publish loaded state, and release audio resources', async () => {
    const audioContext = createAudioContextFixture()
    const piano = createPianoFixture()
    const cleanupPreparation = vi.fn()
    vi.mocked(getAudioContext).mockReturnValue(audioContext)
    vi.mocked(prepareAudioContext).mockReturnValue(cleanupPreparation)
    vi.mocked(createSplendidGrandPianoExtended).mockReturnValue(
      piano as unknown as SplendidGrandPianoExtended,
    )

    const root = createPianoRoot()

    expect(createSplendidGrandPianoExtended).toHaveBeenCalledWith(
      audioContext,
      expect.objectContaining({onEnded: expect.any(Function), onStart: expect.any(Function)}),
    )
    expect(audioContext.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
    expect(root.state().loaded).toBe(false)

    piano.resolveLoad()
    await Promise.resolve()

    expect(root.state().loaded).toBe(true)

    root.dispose()

    expect(cleanupPreparation).toHaveBeenCalledOnce()
    expect(piano.stop).toHaveBeenCalledOnce()
    expect(audioContext.removeEventListener).toHaveBeenCalledWith(
      'statechange',
      expect.any(Function),
    )
  })

  it('should initialize when the prepared audio context arrives later', () => {
    const audioContext = createAudioContextFixture()
    const piano = createPianoFixture()
    let activate = (_audioContext: AudioContext) => {
      //
    }
    vi.mocked(getAudioContext).mockReturnValue(undefined)
    vi.mocked(prepareAudioContext).mockImplementation((listener) => {
      activate = listener

      return vi.fn()
    })
    vi.mocked(createSplendidGrandPianoExtended).mockReturnValue(
      piano as unknown as SplendidGrandPianoExtended,
    )

    const root = createPianoRoot()

    expect(createSplendidGrandPianoExtended).not.toHaveBeenCalled()

    activate(audioContext)

    expect(createSplendidGrandPianoExtended).toHaveBeenCalledWith(audioContext, expect.any(Object))
    root.dispose()
  })

  it('should skip initialization without a browser window', () => {
    vi.mocked(getWindow).mockReturnValue(null)
    vi.mocked(getAudioContext).mockReturnValue(createAudioContextFixture())

    const root = createPianoRoot()

    expect(createSplendidGrandPianoExtended).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should delegate playback controls and update playback state', () => {
    vi.useFakeTimers()
    const audioContext = createAudioContextFixture()
    const piano = createPianoFixture()
    const stopDown = vi.fn()
    piano.down.mockReturnValue(stopDown)
    vi.mocked(getAudioContext).mockReturnValue(audioContext)
    vi.mocked(createSplendidGrandPianoExtended).mockReturnValue(
      piano as unknown as SplendidGrandPianoExtended,
    )
    const root = createPianoRoot()

    root.controller.play({id: 'empty', totalDuration: 5})
    expect(piano.play).not.toHaveBeenCalled()

    root.controller.play({
      id: 'song',
      midi: [[{note: 'C4'}], [{note: 'E4'}]],
      totalDuration: 10,
    })

    expect(piano.stop).toHaveBeenCalledOnce()
    expect(piano.play).toHaveBeenNthCalledWith(1, {
      channelName: 0,
      id: 'song',
      notes: [{note: 'C4'}],
      totalDuration: 10,
    })
    expect(piano.play).toHaveBeenNthCalledWith(2, {
      channelName: 1,
      id: 'song',
      notes: [{note: 'E4'}],
      totalDuration: 10,
    })
    expect(root.state()).toMatchObject({leftTime: 10, playedTime: 0, playingId: 'song'})

    vi.advanceTimersByTime(250)
    expect(root.state()).toMatchObject({leftTime: 7, playedTime: 3})

    root.controller.suspend()
    expect(piano.suspend).toHaveBeenCalledOnce()
    expect(root.state().suspended).toBe(true)

    root.controller.resume()
    expect(piano.resume).toHaveBeenCalledWith(undefined)
    expect(root.state().suspended).toBe(false)

    root.controller.seek(4)
    expect(piano.seek).toHaveBeenCalledWith(4)
    expect(root.state()).toMatchObject({leftTime: 7, playedTime: 4})

    expect(root.controller.down('C4')).toBe(stopDown)
    expect(piano.down).toHaveBeenCalledWith('C4')
    root.controller.up('C4')
    expect(piano.up).toHaveBeenCalledWith('C4')

    root.controller.stop()
    expect(root.state()).toMatchObject({
      leftTime: 0,
      playedTime: 0,
      playingId: '',
      suspended: false,
      totalDuration: 0,
    })
    root.dispose()
  })

  it('should reset playback when the audio context becomes suspended', () => {
    const audioContext = createAudioContextFixture()
    const piano = createPianoFixture()
    vi.mocked(getAudioContext).mockReturnValue(audioContext)
    vi.mocked(createSplendidGrandPianoExtended).mockReturnValue(
      piano as unknown as SplendidGrandPianoExtended,
    )
    const root = createPianoRoot()
    root.controller.play({id: 'song', midi: [[]], totalDuration: 10})
    ;(audioContext as unknown as {state: string}).state = 'suspended'
    const stateChangeListener = vi.mocked(audioContext.addEventListener).mock.calls[0]?.[1]

    expect(stateChangeListener).toBeDefined()
    ;(stateChangeListener as EventListener)({target: audioContext} as unknown as Event)

    expect(root.state()).toMatchObject({playingId: '', suspended: false})
    root.dispose()
  })

  it('should emit mapped automatic note transitions and ignore user input transitions', () => {
    const audioContext = createAudioContextFixture()
    const piano = createPianoFixture()
    const onEmitInstrument = vi.fn()
    vi.mocked(getAudioContext).mockReturnValue(audioContext)
    vi.mocked(createSplendidGrandPianoExtended).mockReturnValue(
      piano as unknown as SplendidGrandPianoExtended,
    )
    const root = createRoot((dispose) => {
      const result = createSplendidGrandPiano({onEmitInstrument})

      return {dispose, result}
    })
    const factoryOptions = vi.mocked(createSplendidGrandPianoExtended).mock.calls[0]?.[1]
    const automaticPayload = {
      [CHANNEL_NAME_KEY]: 2,
      note: 'C4',
      [ORIGINAL_NOTE_KEY]: 'C4',
      [USER_PLAY_FLAG_KEY]: false,
    } as ExtendedSampleStart

    factoryOptions?.onStart?.(automaticPayload)
    factoryOptions?.onEnded?.(automaticPayload)

    expect(onEmitInstrument).toHaveBeenNthCalledWith(1, new Set(['65']), {
      channelName: 2,
      isDown: true,
      renderOnly: true,
    })
    expect(onEmitInstrument).toHaveBeenNthCalledWith(2, new Set(['65']), {
      channelName: 2,
      isDown: false,
      renderOnly: true,
    })

    const userPayload = {...automaticPayload, [USER_PLAY_FLAG_KEY]: true}
    factoryOptions?.onStart?.(userPayload)
    factoryOptions?.onEnded?.(userPayload)

    expect(onEmitInstrument).toHaveBeenCalledTimes(2)
    root.dispose()
  })

  it('should not publish a completed load after cleanup has started', async () => {
    const audioContext = createAudioContextFixture()
    const piano = createPianoFixture()
    let cleanupStarted = false
    vi.mocked(useIsCleanup).mockReturnValue(() => cleanupStarted)
    vi.mocked(getAudioContext).mockReturnValue(audioContext)
    vi.mocked(createSplendidGrandPianoExtended).mockReturnValue(
      piano as unknown as SplendidGrandPianoExtended,
    )
    const root = createPianoRoot()
    cleanupStarted = true

    piano.resolveLoad()
    await Promise.resolve()

    expect(root.state().loaded).toBe(false)
    root.dispose()
  })

  it('should reject controls that require an unavailable piano', () => {
    vi.mocked(getAudioContext).mockReturnValue(undefined)
    const root = createPianoRoot()

    expect(() => root.controller.stop()).toThrow('Play able Piano not found')
    root.dispose()
  })
})
