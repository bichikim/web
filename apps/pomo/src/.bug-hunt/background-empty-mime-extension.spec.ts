/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {type BackgroundRepository, type BackgroundSnapshot, DEFAULT_BACKGROUND} from 'src/features/background/model'
import {getBackgroundRepository} from 'src/features/background/repository'
import {useBackground} from 'src/features/background/use-background'

vi.mock('src/features/background/repository', () => ({getBackgroundRepository: vi.fn()}))
vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))

let snapshot: BackgroundSnapshot
let repository: BackgroundRepository

beforeEach(() => {
  vi.clearAllMocks()
  snapshot = {items: [], preferences: DEFAULT_BACKGROUND}
  repository = {
    add: vi.fn(),
    configure: vi.fn(async (patch) => {
      snapshot = {...snapshot, preferences: {...snapshot.preferences, ...patch}}
    }),
    load: vi.fn(),
    read: vi.fn(async () => snapshot),
    remove: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
  vi.mocked(getBackgroundRepository).mockResolvedValue(repository)
})

it('should import a PNG photo by extension when the browser omits file.type', async () => {
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))

  const photo = new File([new Uint8Array([0x89, 0x50])], 'vacation.png', {type: ''})
  Object.defineProperty(photo, 'size', {value: 1_000})

  await result.add([photo])

  expect(repository.add).toHaveBeenCalledWith(photo, 'photo')
  expect(result.error()).toBeNull()
  cleanup()
})
