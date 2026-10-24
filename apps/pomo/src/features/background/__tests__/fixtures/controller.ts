import {vi} from 'vitest'
import {type BackgroundController, DEFAULT_BACKGROUND} from '../..'

export const createBackground = (): BackgroundController => ({
  add: vi.fn(async () => undefined),
  busy: () => false,
  configure: vi.fn(async () => undefined),
  error: () => null,
  failedIds: () => [],
  items: () => [],
  load: vi.fn(async () => new Blob(['image'], {type: 'image/png'})),
  markFailed: vi.fn(),
  pick: vi.fn(async () => undefined),
  preferences: () => DEFAULT_BACKGROUND,
  ready: () => true,
  remove: vi.fn(async () => undefined),
  retry: vi.fn(),
})
