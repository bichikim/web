import {describe, expect, it, vi} from 'vitest'
import {
  CHANNEL_NAME_KEY,
  createSplendidGrandPianoExtended,
  ORIGINAL_NOTE_KEY,
  PLAY_STARTED_AT_KEY,
  PlayOptions,
  TARGET_ID_KEY,
  USER_PLAY_FLAG_KEY,
} from './splendid-grand-piano-extended'
import {getAudioContext} from './prepare-audio-context'

vi.mock('smplr', () => {
  let _currentTime = 33

  const mockAudioContext = {
    get currentTime() {
      return _currentTime
    },
    resume: () => {
      // empty
    },
  } as AudioContext

  return {
    CacheStorage: class {
      get() {
        return Promise.resolve(null)
      }
      set() {
        return Promise.resolve()
      }
    },
    SplendidGrandPiano: vi.fn().mockImplementation(() => ({
      __setCurrentTime: (time: number) => {
        _currentTime = time
      },
      context: mockAudioContext,
      start: vi.fn(() => vi.fn()),
      stop: vi.fn(),
    })),
  }
})

vi.mock('./prepare-audio-context', () => {
  const mockAudioContext = {
    currentTime: 33,
    resume: () => {
      // empty
    },
  } as AudioContext

  return {
    getAudioContext: vi.fn().mockReturnValue(mockAudioContext),
  }
})

describe('createSplendidGrandPianoExtended', () => {
  describe('down function', () => {
    it('should call original piano start function', () => {
      const piano = createSplendidGrandPianoExtended(getAudioContext() as AudioContext)
      const stopFn = piano?.down('C4')

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'C4',
          [PLAY_STARTED_AT_KEY]: 33,
          [TARGET_ID_KEY]: '',
          [USER_PLAY_FLAG_KEY]: true,
          note: 'C4',
          stopId: 'user-input|C4',
          time: 33,
          velocity: 100,
        }),
      )
      expect(typeof stopFn).toBe('function')
    })
  })

  describe('play function', () => {
    it('should work correctly', () => {
      const piano = createSplendidGrandPianoExtended(getAudioContext() as AudioContext)

      const playOptions: PlayOptions = {
        id: 'test',
        notes: [{note: 'C4'}, {note: 'E4'}, {note: 'G4'}],
        totalDuration: 20,
      }

      piano?.play(playOptions)

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'C4',
          [PLAY_STARTED_AT_KEY]: 33,
          [TARGET_ID_KEY]: 'test',
          [USER_PLAY_FLAG_KEY]: false,
          note: 'C4',
          stopId: 'C4',
          time: 33,
          velocity: 100,
        }),
      )

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'E4',
          [PLAY_STARTED_AT_KEY]: 33,
          [TARGET_ID_KEY]: 'test',
          [USER_PLAY_FLAG_KEY]: false,
          note: 'E4',
          stopId: 'E4',
          time: 33,
          velocity: 100,
        }),
      )

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'G4',
          [PLAY_STARTED_AT_KEY]: 33,
          [TARGET_ID_KEY]: 'test',
          [USER_PLAY_FLAG_KEY]: false,
          note: 'G4',
          stopId: 'G4',
          time: 33,
          velocity: 100,
        }),
      )
    })
  })

  describe('resume function', () => {
    it('should work correctly', () => {
      const piano = createSplendidGrandPianoExtended(getAudioContext() as AudioContext)

      const playOptions: PlayOptions = {
        id: 'test',
        notes: [
          {note: 'C4', time: 0},
          {note: 'E4', time: 20},
        ],
        totalDuration: 20,
      }

      piano?.play(playOptions)

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'C4',
          [PLAY_STARTED_AT_KEY]: 33,
          [USER_PLAY_FLAG_KEY]: false,
          note: 'C4',
          stopId: 'C4',
          time: 33,
        }),
      )

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'E4',
          [PLAY_STARTED_AT_KEY]: 33,
          [USER_PLAY_FLAG_KEY]: false,
          note: 'E4',
          stopId: 'E4',
          time: 53,
          velocity: 100,
        }),
      )
      ;(piano?.__original as any).__setCurrentTime(44)
      piano?.suspend()

      expect(piano?.__original.stop).toHaveBeenNthCalledWith(1)
      ;(piano?.__original as any).__setCurrentTime(55)
      piano?.resume()

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'E4',
          [PLAY_STARTED_AT_KEY]: 55,
          [USER_PLAY_FLAG_KEY]: false,
          note: 'E4',
          stopId: 'E4',
          time: 64,
          velocity: 100,
        }),
      )
    })
  })

  describe('seek function', () => {
    it('should work without calling start', () => {
      const piano = createSplendidGrandPianoExtended(getAudioContext() as AudioContext)

      piano?.seek(0)
      expect(piano?.__original.start).not.toHaveBeenCalled()
      expect(piano?.__original.stop).toHaveBeenCalled()
    })

    it('should work with calling start', () => {
      const piano = createSplendidGrandPianoExtended(getAudioContext() as AudioContext)

      const playOptions: PlayOptions = {
        id: 'test',
        notes: [
          {note: 'C4', time: 0},
          {note: 'E4', time: 20},
        ],
        totalDuration: 20,
      }

      piano?.play(playOptions)
      piano?.seek(10)

      expect(piano?.__original.start).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          [CHANNEL_NAME_KEY]: undefined,
          [ORIGINAL_NOTE_KEY]: 'E4',
          [PLAY_STARTED_AT_KEY]: 55,
          [TARGET_ID_KEY]: '',
          [USER_PLAY_FLAG_KEY]: false,
          note: 'E4',
          stopId: 'E4',
          time: 65,
          velocity: 100,
        }),
      )
      expect(piano?.__original.stop).toHaveBeenCalled()
    })
  })
})
