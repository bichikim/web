/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PreferenceProvider, usePreference} from '..'
import {
  createDisplayThemePreferenceRepository,
  parseDisplayThemePreference,
} from 'src/features/display-theme/storage'
import type {DisplayThemePreference} from 'src/features/display-theme/model'

afterEach(cleanup)

it('should own edits during repository restoration and serialize subsequent native saves', async () => {
  const restoring = Promise.withResolvers<unknown>()
  const firstSave = Promise.withResolvers<void>()
  const writeToss = vi
    .fn()
    .mockImplementationOnce(() => firstSave.promise)
    .mockResolvedValue(undefined)
  const repository = createDisplayThemePreferenceRepository({
    now: () => 100,
    storage: {
      readToss: () => restoring.promise,
      readWeb: () => null,
      removeWeb: () => null,
      usesTossStorage: () => true,
      writeToss,
      writeWeb: vi.fn(),
    },
  })
  const {
    result: [value, setValue],
  } = renderHook(
    () =>
      usePreference<DisplayThemePreference>({
        defaultValue: 'system',
        key: 'theme',
        parse: parseDisplayThemePreference,
        storage: {
          read: repository.read,
          write: (_key, input) => repository.write(parseDisplayThemePreference(input) ?? 'system'),
        },
      }),
    {wrapper: PreferenceProvider},
  )
  setValue('dark')
  expect(value()).toBe('dark')
  expect(writeToss).not.toHaveBeenCalled()
  restoring.resolve('bright')
  await vi.waitFor(() => expect(writeToss).toHaveBeenCalledTimes(1))
  setValue('bright')
  expect(value()).toBe('bright')
  expect(writeToss).toHaveBeenCalledTimes(1)
  firstSave.resolve()
  await vi.waitFor(() => expect(writeToss).toHaveBeenCalledTimes(2))
  expect(writeToss.mock.calls.map((call) => call[1])).toEqual([
    {preference: 'dark', savedAt: 100},
    {preference: 'bright', savedAt: 101},
  ])
})

it('should finish native repair before saving an edit made during restoration', async () => {
  const repair = Promise.withResolvers<void>()
  const writeToss = vi
    .fn()
    .mockImplementationOnce(() => repair.promise)
    .mockResolvedValue(undefined)
  const repository = createDisplayThemePreferenceRepository({
    now: () => 100,
    storage: {
      readToss: vi.fn(),
      readWeb: () => 'bright',
      removeWeb: () => null,
      usesTossStorage: () => true,
      writeToss,
      writeWeb: vi.fn(),
    },
  })
  const {
    result: [value, setValue],
  } = renderHook(
    () =>
      usePreference<DisplayThemePreference>({
        defaultValue: 'system',
        key: 'theme',
        parse: parseDisplayThemePreference,
        storage: {
          read: repository.read,
          write: (_key, input) => repository.write(parseDisplayThemePreference(input) ?? 'system'),
        },
      }),
    {wrapper: PreferenceProvider},
  )
  setValue('dark')
  await Promise.resolve()
  await Promise.resolve()
  expect(value()).toBe('dark')
  expect(writeToss).toHaveBeenCalledTimes(1)
  repair.resolve()
  await vi.waitFor(() => expect(writeToss).toHaveBeenCalledTimes(2))
  expect(writeToss.mock.calls.map((call) => call[1])).toEqual([
    {preference: 'bright', savedAt: 0},
    {preference: 'dark', savedAt: 100},
  ])
})

it('should defer a save until an external refresh and its storage side effects finish', async () => {
  const refresh = Promise.withResolvers<unknown>()
  let notify: (key: string) => void = () => undefined
  let persisted: unknown = 1
  const storage = {
    read: vi
      .fn()
      .mockReturnValueOnce(1)
      .mockImplementation(() =>
        refresh.promise.then((value) => {
          persisted = value
          return value
        }),
      ),
    subscribe: (listener: (key: string) => void) => {
      notify = listener
      return () => undefined
    },
    write: vi.fn((_key: string, value: unknown) => {
      persisted = value
    }),
  }
  const {
    result: [value, setValue],
  } = renderHook(
    () =>
      usePreference({
        defaultValue: 0,
        key: 'refresh',
        parse: (input) => (typeof input === 'number' ? input : null),
        storage,
      }),
    {wrapper: PreferenceProvider},
  )
  notify('refresh')
  setValue(3)
  expect(value()).toBe(3)
  expect(storage.write).not.toHaveBeenCalled()
  refresh.resolve(2)
  await vi.waitFor(() => expect(storage.write).toHaveBeenCalledWith('refresh', 3))
  expect(persisted).toBe(3)
  expect(value()).toBe(3)
})

it('should persist synchronous edits immediately after an asynchronous restoration settles', async () => {
  const restoration = Promise.withResolvers<unknown>()
  const write = vi.fn()
  const {
    result: [value, setValue],
  } = renderHook(
    () =>
      usePreference({
        defaultValue: 0,
        key: 'sync-after-restore',
        parse: (input) => (typeof input === 'number' ? input : null),
        storage: {read: () => restoration.promise, write},
      }),
    {wrapper: PreferenceProvider},
  )
  restoration.resolve(1)
  await vi.waitFor(() => expect(value()).toBe(1))
  setValue(2)
  expect(write).toHaveBeenCalledWith('sync-after-restore', 2)
})
