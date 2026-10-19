import {TestWorker} from './sound-worker'
export {TestWorker} from './sound-worker'
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cleanup} from '@solidjs/testing-library'
import {afterEach, beforeEach, vi} from 'vitest'
import {createLoopPlayer} from 'src/features/loop-player/player'

export const loopPlayback = {
  close: vi.fn(async () => undefined),
  duration: 20,
  onPosition: undefined as ((seconds: number) => void) | undefined,
  onStatus: undefined as ((message: string, playing: boolean) => void) | undefined,
  play: vi.fn(async () => true),
  seek: vi.fn(async () => false),
  setVolume: vi.fn(),
  stop: vi.fn(),
}

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('src/features/loop-player/player', () => ({createLoopPlayer: vi.fn()}))

beforeEach(() => {
  vi.mocked(Title).mockReturnValue(null)
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
  vi.mocked(createLoopPlayer).mockImplementation((_url, onStatus, onReady, onPosition) => {
    loopPlayback.onPosition = onPosition
    loopPlayback.onStatus = onStatus
    onReady?.(loopPlayback.duration)
    return loopPlayback
  })
  vi.stubGlobal('Worker', TestWorker)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:sound-result')
      static revokeObjectURL = vi.fn()
    },
  )
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  loopPlayback.duration = 20
  loopPlayback.onPosition = undefined
  loopPlayback.onStatus = undefined
  vi.unstubAllGlobals()
})
