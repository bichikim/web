import {afterEach, expect, it, vi} from 'vitest'
import {createInterfaceLanguage} from '../create-interface-language'
import type {InterfaceLanguage, InterfaceLanguagePort} from '../types'

afterEach(() => vi.restoreAllMocks())

const deferred = <Value>() => {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((done) => {
    resolve = done
  })
  return {promise, resolve}
}

const port = (overrides: Partial<InterfaceLanguagePort> = {}): InterfaceLanguagePort => ({
  listen: vi.fn<InterfaceLanguagePort['listen']>(async () => vi.fn<() => void>()),
  read: vi.fn<InterfaceLanguagePort['read']>(async () => 'ko'),
  save: vi.fn<InterfaceLanguagePort['save']>(async () => undefined),
  ...overrides,
})

it('should restore the saved language and unsubscribe on disposal', async () => {
  const unsubscribe = vi.fn()
  const state = createInterfaceLanguage(
    port({listen: async () => unsubscribe, read: async () => 'en'}),
  )
  const dispose = await state.start()
  expect(state.language()).toBe('en')
  dispose()
  expect(unsubscribe).toHaveBeenCalledOnce()
})

it('should keep a newer window event when the initial read finishes late', async () => {
  const loading = deferred<InterfaceLanguage>()
  let receive!: (language: InterfaceLanguage) => void
  const state = createInterfaceLanguage(
    port({
      listen: async (next) => {
        receive = next
        return vi.fn<() => void>()
      },
      read: () => loading.promise,
    }),
  )
  const started = state.start()
  await Promise.resolve()
  receive('en')
  loading.resolve('ko')
  const dispose = await started
  expect(state.language()).toBe('en')
  dispose()
  receive('ko')
  expect(state.language()).toBe('en')
})

it('should serialize changes and keep the last requested language', async () => {
  const first = deferred<void>()
  const save = vi
    .fn()
    .mockImplementationOnce(() => first.promise)
    .mockResolvedValue(undefined)
  const state = createInterfaceLanguage(port({save}))
  const english = state.change('en')
  const korean = state.change('ko')
  await Promise.resolve()
  expect(save).toHaveBeenCalledExactlyOnceWith('en')
  expect(state.busy()).toBe(true)
  first.resolve()
  await Promise.all([english, korean])
  expect(save.mock.calls).toEqual([['en'], ['ko']])
  expect(state.language()).toBe('ko')
  expect(state.busy()).toBe(false)
})

it('should preserve the current language after a failed save and allow retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const save = vi.fn().mockRejectedValueOnce(Error('disk unavailable')).mockResolvedValue(undefined)
  const state = createInterfaceLanguage(port({save}))
  await state.change('en')
  expect(state.language()).toBe('ko')
  expect(state.error()).not.toBeNull()
  expect(state.busy()).toBe(false)
  await state.change('en')
  expect(state.language()).toBe('en')
  expect(state.error()).toBeNull()
})

it('should report an initialization failure without losing later selections', async () => {
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const state = createInterfaceLanguage(
    port({
      listen: async () => {
        throw Error('event channel unavailable')
      },
    }),
  )
  const dispose = await state.start()
  expect(state.error()).not.toBeNull()
  await state.change('en')
  expect(state.language()).toBe('en')
  expect(state.error()).toBeNull()
  dispose()
})
