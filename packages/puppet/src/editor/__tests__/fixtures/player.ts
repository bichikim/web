import {vi} from 'vitest'
import type {Player, PlayerPlaybackOptions} from '../../../player'

export const createPlayerFixture = (): Player => ({
  clearParameterValues: vi.fn(),
  destroy: vi.fn(),
  getParameterValue: vi.fn(),
  getParameterValues: vi.fn(() => ({})),
  pause: vi.fn(),
  play: vi.fn(),
  playMotion: vi.fn<(motionId: string, options?: PlayerPlaybackOptions) => boolean>(() => true),
  redraw: vi.fn(),
  resetParameters: vi.fn(),
  resetPhysics: vi.fn(),
  resize: vi.fn(),
  resume: vi.fn(),
  seek: vi.fn(),
  setMotion: vi.fn(() => true),
  setParameterValue: vi.fn(() => true),
  setParameterValues: vi.fn(),
  setPhysicsPreview: vi.fn(),
  setPlaybackSpeed: vi.fn(),
  startMotion: vi.fn(),
  stop: vi.fn(),
  updateDocument: vi.fn(() => true),
})
