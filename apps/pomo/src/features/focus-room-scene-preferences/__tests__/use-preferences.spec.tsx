/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'

import {usePScenePreferences} from '../index'

const storageMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../storage', async () => {
  const actual: typeof import('../storage') = await vi.importActual('../storage')
  return {
    ...actual,
    readPScenePreferences: storageMocks.read,
    writePScenePreferences: storageMocks.write,
  }
})

const storedPreferences = {
  activity: 'typing',
  gaze: 'user',
  timeMode: 'auto',
} as const

beforeEach(() => {
  storageMocks.read.mockReset().mockResolvedValue(storedPreferences)
  storageMocks.write.mockReset().mockResolvedValue(undefined)
})

it('should restore every stored scene preference after mounting', async () => {
  const {result} = renderHook(usePScenePreferences, {wrapper: PreferenceProvider})

  expect(result?.isReady()).toBe(false)
  await vi.waitFor(() => expect(result?.timeMode()).toBe('auto'))
  expect(result?.activity()).toBe('typing')
  expect(result?.gaze()).toBe('user')
  expect(result?.isReady()).toBe(true)
})

it('should persist the complete latest snapshot after each choice', async () => {
  storageMocks.read.mockResolvedValueOnce({activity: 'reading', gaze: 'focused', timeMode: 'day'})
  const {result} = renderHook(usePScenePreferences, {wrapper: PreferenceProvider})

  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  result?.onTimeModeChange('night')
  result?.onActivityChange('writing')
  result?.onGazeChange('user')

  await vi.waitFor(() => expect(storageMocks.write).toHaveBeenCalledTimes(3))

  expect(storageMocks.write).toHaveBeenNthCalledWith(1, {
    activity: 'reading',
    gaze: 'focused',
    timeMode: 'night',
  })
  expect(storageMocks.write).toHaveBeenNthCalledWith(2, {
    activity: 'writing',
    gaze: 'focused',
    timeMode: 'night',
  })
  expect(storageMocks.write).toHaveBeenNthCalledWith(3, {
    activity: 'writing',
    gaze: 'user',
    timeMode: 'night',
  })
})

it('should not overwrite newer choices when restoration finishes late', async () => {
  let completeRead: (preferences: typeof storedPreferences) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  const {result} = renderHook(usePScenePreferences, {wrapper: PreferenceProvider})

  result?.onActivityChange('writing')
  completeRead(storedPreferences)

  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  expect(result?.timeMode()).toBe('day')
  expect(result?.activity()).toBe('writing')
  expect(result?.gaze()).toBe('focused')
  expect(storageMocks.write).toHaveBeenLastCalledWith({
    activity: 'writing',
    gaze: 'focused',
    timeMode: 'day',
  })
})

it('should ignore a pending restoration after cleanup', async () => {
  let completeRead: (preferences: typeof storedPreferences) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  const {result, cleanup} = renderHook(usePScenePreferences, {wrapper: PreferenceProvider})

  cleanup()
  completeRead(storedPreferences)
  await Promise.resolve()
  await Promise.resolve()

  expect(result?.isReady()).toBe(false)
  expect(result?.activity()).not.toBe(storedPreferences.activity)
  expect(storageMocks.write).not.toHaveBeenCalled()
})
