import {vi} from 'vitest'
import type {PlaybackBackground} from '../../use-playback'
import {DEFAULT_BACKGROUND} from '../../../model'

export const createBackground = (): PlaybackBackground => ({
  failedIds: () => [],
  items: () => [],
  markFailed: vi.fn(),
  preferences: () => DEFAULT_BACKGROUND,
})
