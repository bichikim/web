/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createRenderEffect} from 'solid-js'
import {PreferenceProvider, usePreference} from '..'
import type {PreferenceStorage} from 'src/utils/preference-storage'

const options = {
  defaultValue: 10,
  key: 'setting',
  parse: (value: unknown) => (typeof value === 'number' ? value : null),
}
afterEach(cleanup)
const renderPreference = (storage: PreferenceStorage, onError = vi.fn()) =>
  renderHook(() => [usePreference(options), usePreference(options)] as const, {
    wrapper: (props) => (
      <PreferenceProvider storage={storage} onError={onError}>
        {props.children}
      </PreferenceProvider>
    ),
  })

it('should stay null until an asynchronous read completes', async () => {
  const read = Promise.withResolvers<unknown>()
  const {result} = renderPreference({read: () => read.promise, write: () => null})
  expect(result[0][0]()).toBeNull()
  read.resolve(25)
  await read.promise
  expect(result[0][0]()).toBe(25)
  expect(result[1][0]()).toBe(25)
})

it('should not overwrite a newer local value with a delayed initial read', async () => {
  const read = Promise.withResolvers<unknown>()
  const write = vi.fn(() => null)
  const {result} = renderPreference({read: () => read.promise, write})
  result[0][1](50)
  read.resolve(25)
  await read.promise
  expect(result[1][0]()).toBe(50)
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith('setting', 50))
})

it('should serialize writes while updating all consumers immediately', async () => {
  const first = Promise.withResolvers<unknown>()
  const second = Promise.withResolvers<unknown>()
  const started = Promise.withResolvers<void>()
  const write = vi
    .fn()
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => {
      started.resolve()
      return second.promise
    })
  const {result} = renderPreference({read: () => 0, write})
  result[0][1](1)
  result[0][1](2)
  expect(result[1][0]()).toBe(2)
  expect(write).toHaveBeenCalledTimes(1)
  first.resolve(null)
  await started.promise
  expect(write.mock.calls).toEqual([
    ['setting', 1],
    ['setting', 2],
  ])
  second.resolve(null)
  await second.promise
})

it('should continue queued writes after a rejection without reverting shared state', async () => {
  const first = Promise.withResolvers<unknown>()
  const started = Promise.withResolvers<void>()
  const write = vi
    .fn()
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => {
      started.resolve()
      return null
    })
  const onError = vi.fn()
  const {result} = renderPreference({read: () => 0, write}, onError)
  result[0][1](1)
  result[0][1](2)
  const failure = new Error('storage unavailable')
  first.reject(failure)
  await started.promise
  expect(onError).toHaveBeenCalledWith(failure)
  expect(result[1][0]()).toBe(2)
  expect(write).toHaveBeenLastCalledWith('setting', 2)
})

it('should report a failed initial read and expose the default', async () => {
  const read = Promise.withResolvers<unknown>()
  const reported = Promise.withResolvers<void>()
  const onError = vi.fn(() => reported.resolve())
  const {result} = renderPreference({read: () => read.promise, write: () => null}, onError)
  const failure = new Error('read failed')
  read.reject(failure)
  await reported.promise
  expect(onError).toHaveBeenCalledWith(failure)
  expect(result[0][0]()).toBe(10)
})

it('should ignore a pending read and unsubscribe after disposal', async () => {
  const read = Promise.withResolvers<unknown>()
  const unsubscribe = vi.fn()
  const subscribe = vi.fn(() => unsubscribe)
  const view = renderPreference({read: () => read.promise, subscribe, write: () => null})
  view.cleanup()
  read.resolve(25)
  await read.promise
  expect(view.result[0][0]()).toBeNull()
  expect(subscribe).toHaveBeenCalledTimes(1)
  expect(unsubscribe).toHaveBeenCalledTimes(1)
})

it('should finish an active external read before applying the latest refresh', async () => {
  const older = Promise.withResolvers<unknown>()
  const newer = Promise.withResolvers<unknown>()
  let notify: (key: string | null) => void = () => undefined
  const read = vi
    .fn()
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(older.promise)
    .mockReturnValueOnce(newer.promise)
  const {result} = renderPreference({
    read,
    subscribe: (listener) => {
      notify = listener
      return () => undefined
    },
    write: () => null,
  })
  notify('setting')
  notify('setting')
  expect(read).toHaveBeenCalledTimes(2)
  older.resolve(25)
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(3))
  expect(result[0][0]()).toBe(0)
  newer.resolve(50)
  await vi.waitFor(() => expect(result[0][0]()).toBe(50))
})

it('should defer external refreshes until pending writes finish', async () => {
  const completion = Promise.withResolvers<unknown>()
  const refreshed = Promise.withResolvers<void>()
  let notify: (key: string | null) => void = () => undefined
  const read = vi
    .fn()
    .mockReturnValueOnce(0)
    .mockImplementationOnce(() => {
      refreshed.resolve()
      return 25
    })
  const {result} = renderPreference({
    read,
    subscribe: (listener) => {
      notify = listener
      return () => undefined
    },
    write: () => completion.promise,
  })
  result[0][1](25)
  notify('setting')
  expect(read).toHaveBeenCalledTimes(1)
  expect(result[0][0]()).toBe(25)
  completion.resolve(null)
  await refreshed.promise
  expect(result[0][0]()).toBe(25)
  expect(read).toHaveBeenCalledTimes(2)
})

it('should accept asynchronous writes that resolve without an error value', async () => {
  const completion = Promise.withResolvers<void>()
  const onError = vi.fn()
  const {result} = renderPreference({read: () => 0, write: () => completion.promise}, onError)
  result[0][1](25)
  completion.resolve()
  await completion.promise
  expect(onError).not.toHaveBeenCalled()
  expect(result[1][0]()).toBe(25)
})

it('should report synchronous read errors and still initialize the preference', () => {
  const failure = new Error('read failed')
  const onError = vi.fn()
  const {result} = renderPreference(
    {
      read: () => {
        throw failure
      },
      write: () => null,
    },
    onError,
  )
  expect(result[0][0]()).toBe(10)
  expect(onError).toHaveBeenCalledWith(failure)
})

it('should preserve write order when a reactive consumer immediately updates the value again', () => {
  const write = vi.fn(() => null)
  const storage = {read: () => 0, write}
  const {result} = renderHook(
    () => {
      const preference = usePreference(options)
      createRenderEffect(() => {
        if (preference[0]() === 1) {
          preference[1](2)
        }
      })
      return preference
    },
    {
      wrapper: (props) => (
        <PreferenceProvider storage={storage}>{props.children}</PreferenceProvider>
      ),
    },
  )
  result[1](1)
  expect(result[0]()).toBe(2)
  expect(write.mock.calls).toEqual([
    ['setting', 1],
    ['setting', 2],
  ])
})

it('should keep only the latest edit and save it after initial restoration completes', async () => {
  const restoration = Promise.withResolvers<unknown>()
  const write = vi.fn(() => null)
  const {result} = renderPreference({read: () => restoration.promise, write})
  result[0][1](25)
  result[0][1](50)
  expect(result[1][0]()).toBe(50)
  expect(write).not.toHaveBeenCalled()
  restoration.resolve(1)
  await restoration.promise
  expect(result[0][0]()).toBe(50)
  await vi.waitFor(() => expect(write.mock.calls).toEqual([['setting', 50]]))
})

it('should save edits even when initial restoration fails', async () => {
  const restoration = Promise.withResolvers<unknown>()
  const saved = Promise.withResolvers<void>()
  const write = vi.fn(() => {
    saved.resolve()
    return null
  })
  const onError = vi.fn()
  const {result} = renderPreference({read: () => restoration.promise, write}, onError)
  result[0][1](25)
  restoration.reject(new Error('restore failed'))
  await saved.promise
  expect(result[0][0]()).toBe(25)
  expect(write).toHaveBeenCalledWith('setting', 25)
  expect(onError).toHaveBeenCalledTimes(1)
})

it('should share each key and route external changes only to its selected adapter', () => {
  let notify: (key: string | null) => void = () => undefined
  const first = {
    read: vi.fn(() => 1),
    subscribe: (listener: typeof notify) => {
      notify = listener
      return () => undefined
    },
    write: vi.fn(() => null),
  }
  const second = {read: vi.fn(() => 2), write: vi.fn(() => null)}
  const {result} = renderHook(
    () =>
      [
        usePreference({...options, key: 'first', storage: first}),
        usePreference({...options, key: 'first', storage: first}),
        usePreference({...options, key: 'second', storage: second}),
      ] as const,
    {wrapper: PreferenceProvider},
  )
  expect(first.read).toHaveBeenCalledTimes(1)
  result[0][1](3)
  expect(result[1][0]()).toBe(3)
  expect(first.write).toHaveBeenCalledWith('first', 3)
  notify(null)
  expect(first.read).toHaveBeenCalledTimes(2)
  expect(second.read).toHaveBeenCalledTimes(1)
})

it('should finish saving an accepted edit after disposal without applying the restored value', async () => {
  const restoration = Promise.withResolvers<unknown>()
  const write = vi.fn(() => null)
  const view = renderPreference({read: () => restoration.promise, write})
  view.result[0][1](25)
  view.cleanup()
  restoration.resolve(1)
  await restoration.promise
  await vi.waitFor(() => expect(write).toHaveBeenCalledExactlyOnceWith('setting', 25))
  expect(view.result[0][0]()).toBe(25)
})

it('should notify a consumer when a queued save succeeds after an earlier failure', async () => {
  const first = Promise.withResolvers<unknown>()
  const second = Promise.withResolvers<unknown>()
  const onError = vi.fn()
  const onSaved = vi.fn()
  const storage = {
    read: () => 0,
    write: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
  }
  const {result} = renderHook(() => usePreference({...options, onError, onSaved, storage}), {
    wrapper: PreferenceProvider,
  })
  result[1](1)
  result[1](2)
  first.reject(new Error('first failed'))
  await vi.waitFor(() => expect(storage.write).toHaveBeenCalledTimes(2))
  expect(onError).toHaveBeenCalledTimes(1)
  expect(onSaved).not.toHaveBeenCalled()
  second.resolve(null)
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
})

it('should refresh an external change received during initial restoration', async () => {
  const initial = Promise.withResolvers<unknown>()
  let notify: (key: string | null) => void = () => undefined
  const read = vi.fn().mockReturnValueOnce(initial.promise).mockReturnValueOnce(50)
  const {result} = renderPreference({
    read,
    subscribe: (listener) => {
      notify = listener
      return () => undefined
    },
    write: () => null,
  })
  notify('setting')
  initial.resolve(1)
  await initial.promise
  expect(read).toHaveBeenCalledTimes(2)
  expect(result[0][0]()).toBe(50)
})

it.each(['saved', 'failed'] as const)(
  'should retain the queue when a %s callback starts an asynchronous edit',
  async (outcome) => {
    const second = Promise.withResolvers<unknown>()
    let setValue: (value: number) => void = () => undefined
    let callbackCount = 0
    let persisted = 0
    const write = vi.fn((_key: string, value: unknown) => {
      if (value === 2) {
        return second.promise.then(() => {
          persisted = 2
        })
      }
      persisted = Number(value)
      return value === 1 && outcome === 'failed' ? new Error('first save failed') : null
    })
    const followup = () => {
      callbackCount += 1
      if (callbackCount === 1) {
        setValue(2)
      }
    }
    const {result} = renderHook(
      () =>
        usePreference({
          ...options,
          onError: followup,
          onSaved: followup,
          storage: {read: () => 0, write},
        }),
      {wrapper: PreferenceProvider},
    )
    setValue = result[1]
    setValue(1)
    setValue(3)
    expect(result[0]()).toBe(3)
    expect(write.mock.calls.map((call) => call[1])).toEqual([1, 2])
    second.resolve(null)
    await vi.waitFor(() => expect(write.mock.calls.map((call) => call[1])).toEqual([1, 2, 3]))
    expect(persisted).toBe(3)
  },
)
