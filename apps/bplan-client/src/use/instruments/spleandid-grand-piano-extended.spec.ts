import {describe, expect, it, vi} from 'vitest'
import {
  createSplendidGrandPianoExtended,
  PLAY_STARTED_AT_KEY,
  PlayOptions,
  SampleStart,
  StopFn,
  TARGET_ID_KEY,
  USER_PLAY_FLAG_KEY,
} from './splendid-grand-piano-extended'
import {SplendidGrandPiano} from 'smplr'
import {getAudioContext} from './prepare-audio-context'

vi.mock('smplr', () => {
  let _currentTime = 33

  const mockAudioContext = {
    get currentTime() {
      return _currentTime
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

      expect(piano?.__original.start).toHaveBeenNthCalledWith(1, {
        [PLAY_STARTED_AT_KEY]: 33,
        [TARGET_ID_KEY]: '',
        [USER_PLAY_FLAG_KEY]: true,
        note: 'C4',
        time: 33,
        velocity: 100,
      })
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

      expect(piano?.__original.start).toHaveBeenNthCalledWith(1, {
        note: 'C4',
      })

      expect(piano?.__original.start).toHaveBeenNthCalledWith(2, {
        note: 'E4',
      })

      expect(piano?.__original.start).toHaveBeenNthCalledWith(3, {
        note: 'G4',
      })
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

      expect(piano?.__original.start).toHaveBeenNthCalledWith(1, {
        note: 'C4',
        time: 0,
      })

      expect(piano?.__original.start).toHaveBeenNthCalledWith(2, {
        note: 'E4',
        time: 20,
      })
      ;(piano?.__original as any).__setCurrentTime(44)
      piano?.suspend()

      expect(piano?.__original.stop).toHaveBeenNthCalledWith(1)
      ;(piano?.__original as any).__setCurrentTime(55)
      piano?.resume()

      expect(piano?.__original.start).toHaveBeenNthCalledWith(3, {
        note: 'E4',
        time: 9,
      })
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

      expect(piano?.__original.start).toHaveBeenNthCalledWith(3, {
        note: 'E4',
        time: 10,
      })
      expect(piano?.__original.stop).toHaveBeenCalled()
    })
  })
})
