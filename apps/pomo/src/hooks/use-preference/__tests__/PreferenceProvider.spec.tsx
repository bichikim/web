/** @vitest-environment jsdom */
import {cleanup, render, renderHook, screen} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {usePreference} from 'src/hooks/use-preference'
import {PreferenceProvider} from '../PreferenceProvider'

const options = {
  defaultValue: 10,
  key: 'test:provider',
  parse: (value: unknown) => (typeof value === 'number' ? value : null),
}
const Value = () => {
  const [value] = usePreference(options)
  return <output>{value()}</output>
}
beforeEach(() => globalThis.localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should own one storage subscription and remove it when disposed', () => {
  const add = vi.spyOn(globalThis, 'addEventListener')
  const remove = vi.spyOn(globalThis, 'removeEventListener')
  const view = renderHook(() => [usePreference(options), usePreference(options)], {
    wrapper: PreferenceProvider,
  })
  const listeners = add.mock.calls.filter(([name]) => name === 'storage')
  expect(listeners).toHaveLength(1)
  view.cleanup()
  expect(remove).toHaveBeenCalledWith('storage', listeners[0][1])
})

it('should isolate provider state while accepting external local storage updates', () => {
  const first = renderHook(() => usePreference(options), {wrapper: PreferenceProvider})
  const second = renderHook(() => usePreference(options), {wrapper: PreferenceProvider})
  first.result[1](25)
  expect(first.result[0]()).toBe(25)
  expect(second.result[0]()).toBe(10)
  globalThis.localStorage.setItem(options.key, '50')
  globalThis.dispatchEvent(
    new StorageEvent('storage', {
      key: options.key,
      storageArea: globalThis.sessionStorage,
    }),
  )
  expect(second.result[0]()).toBe(10)
  globalThis.dispatchEvent(
    new StorageEvent('storage', {
      key: options.key,
      storageArea: globalThis.localStorage,
    }),
  )
  expect(first.result[0]()).toBe(50)
  expect(second.result[0]()).toBe(50)
})

it('should restore preferences first requested after the provider mounts', () => {
  globalThis.localStorage.setItem(options.key, '25')
  const [visible, setVisible] = createSignal(false)
  render(() => (
    <PreferenceProvider>
      <Show when={visible()}>
        <Value />
      </Show>
    </PreferenceProvider>
  ))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  setVisible(true)
  expect(screen.getByRole('status')).toHaveTextContent('25')
})

it('should deliver synchronous restoration failures to a consumer mounted later', () => {
  const failure = new Error('late read failed')
  const onError = vi.fn()
  const providerError = vi.fn()
  const [visible, setVisible] = createSignal(false)
  const Consumer = () => {
    usePreference({
      ...options,
      onError,
      storage: {
        read: () => {
          throw failure
        },
        write: () => null,
      },
    })
    return null
  }
  render(() => (
    <PreferenceProvider onError={providerError}>
      <Show when={visible()}>
        <Consumer />
      </Show>
    </PreferenceProvider>
  ))
  setVisible(true)
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
  expect(providerError).not.toHaveBeenCalled()
})
