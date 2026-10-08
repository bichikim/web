import {vi} from 'vitest'
import type {Player, PlayerPlaybackOptions} from '../../../player'

export const createPlayerFixture = (): Player => ({
  destroy: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  playMotion: vi.fn<(motionId: string, options?: PlayerPlaybackOptions) => boolean>(() => true),
  redraw: vi.fn(),
  resetPhysics: vi.fn(),
  resize: vi.fn(),
  seek: vi.fn(),
  setMotion: vi.fn(() => true),
  setParameterValues: vi.fn(),
  setPhysicsPreview: vi.fn(),
  updateDocument: vi.fn(() => true),
})
