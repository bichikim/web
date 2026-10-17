/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {usePEventController} from '../use-p-event-controller'

const repository = vi.hoisted(() => ({
  dispose: vi.fn(),
  listDialogues: vi.fn(),
  listEventBindings: vi.fn(),
}))
const playback = vi.hoisted(() => ({
  cancel: vi.fn(),
  dispose: vi.fn(),
  playSequence: vi.fn(),
  prepare: vi.fn(),
}))
vi.mock('../repository', () => ({createPDialogueRepository: vi.fn(() => repository)}))
vi.mock('../entry-playback-controller', () => ({
  createEntryPlaybackController: vi.fn(() => playback),
}))
vi.mock('../delayed-end-event-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../delayed-end-event-settings')>()),
  readDelayedEndEventSettings: vi.fn(async () => ({durationMinutes: 30, version: 1})),
}))

beforeEach(() => {
  vi.resetAllMocks()
  repository.listDialogues.mockResolvedValue([])
  playback.prepare.mockResolvedValue(true)
})
afterEach(() => vi.restoreAllMocks())

it.each(['success', 'failure'] as const)(
  'should release concurrent callers after initialization %s and preserve their call order',
  async (ending) => {
    const requested = Promise.withResolvers<void>()
    const bindings = Promise.withResolvers<unknown[]>()
    repository.listEventBindings.mockImplementationOnce(() => {
      requested.resolve()
      return bindings.promise
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const view = renderHook(() => usePEventController({isDelayedEndEventEnabled: false}))
    try {
      const first = view.result.playDialogue('first')
      const second = view.result.playDialogue('second')
      await requested.promise
      expect(playback.prepare).not.toHaveBeenCalled()
      if (ending === 'success') {
        bindings.resolve([])
      } else {
        bindings.reject(new Error('bindings unavailable'))
      }
      await expect(Promise.all([first, second])).resolves.toEqual([true, true])
      expect(playback.prepare.mock.calls).toEqual([
        [repository, 'first'],
        [repository, 'second'],
      ])
      expect(view.result.isLoading()).toBe(false)
      expect(view.result.errorMessage() === null).toBe(ending === 'success')
    } finally {
      view.cleanup()
    }
  },
)

it('should release initialization waiters when disposed before the repository import completes', async () => {
  const view = renderHook(() => usePEventController({isDelayedEndEventEnabled: false}))
  const request = view.result.playDialogue('first')
  view.cleanup()
  await expect(request).resolves.toBe(false)
  expect(playback.prepare).not.toHaveBeenCalled()
  expect(playback.dispose).toHaveBeenCalledOnce()
})

it('should dispose playback before resuming waiters while a repository read is pending', async () => {
  const requested = Promise.withResolvers<void>()
  const bindings = Promise.withResolvers<unknown[]>()
  repository.listEventBindings.mockImplementationOnce(() => {
    requested.resolve()
    return bindings.promise
  })
  const order: string[] = []
  playback.dispose.mockImplementationOnce(() => order.push('dispose'))
  const view = renderHook(() => usePEventController({isDelayedEndEventEnabled: false}))
  const request = view.result.playDialogue('first').then((result) => {
    order.push('resumed')
    return result
  })
  await requested.promise
  view.cleanup()
  await expect(request).resolves.toBe(false)
  expect(order).toEqual(['dispose', 'resumed'])
  expect(playback.prepare).not.toHaveBeenCalled()
  bindings.resolve([])
})
