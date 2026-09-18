/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {useSelection} from '../use-selection'

afterEach(cleanup)
it('should display edits during restoration and persist only the latest selection afterwards', async () => {
  const restored = Promise.withResolvers<string | null>()
  const write = vi.fn(async () => undefined)
  const storage = {
    key: 'tool-test',
    parse: (value: unknown) => (typeof value === 'string' ? value : null),
    read: () => restored.promise,
    write,
  }
  const {result} = renderHook(() => useSelection({initial: 'default', storage}), {
    wrapper: PreferenceProvider,
  })
  result.onChange('first')
  result.onChange('latest')
  expect(result.value()).toBe('latest')
  expect(write).not.toHaveBeenCalled()
  restored.resolve('stored')
  await vi.waitFor(() => expect(write).toHaveBeenCalledExactlyOnceWith('latest'))
  expect(result.value()).toBe('latest')
})

it('should calculate a runtime default only when restoration finds no stored selection', async () => {
  const fallback = vi.fn(() => 'runtime')
  const {result} = renderHook(
    () =>
      useSelection({
        getDefault: fallback,
        initial: 'initial',
        storage: {
          key: 'runtime-default',
          parse: (value: unknown) => (typeof value === 'string' ? value : null),
          read: async () => null,
          write: async () => undefined,
        },
      }),
    {wrapper: PreferenceProvider},
  )
  expect(result.value()).toBe('initial')
  await vi.waitFor(() => expect(result.value()).toBe('runtime'))
  expect(fallback).toHaveBeenCalledTimes(1)
})

it('should use the runtime default when restoring the selection fails', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const failure = new Error('storage unavailable')
  const {result} = renderHook(
    () =>
      useSelection({
        getDefault: () => 'runtime',
        initial: 'initial',
        storage: {
          key: 'failed-default',
          parse: (value: unknown) => (typeof value === 'string' ? value : null),
          read: () => Promise.reject(failure),
          write: async () => undefined,
        },
      }),
    {wrapper: PreferenceProvider},
  )
  await vi.waitFor(() => expect(result.value()).toBe('runtime'))
  expect(warning).toHaveBeenCalledWith('Failed to restore tool selection.', failure)
  warning.mockRestore()
})
