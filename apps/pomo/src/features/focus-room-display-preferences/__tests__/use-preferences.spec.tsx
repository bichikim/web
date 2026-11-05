/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'

import {type PDisplayPreferences, usePDisplayPreferences} from '../index'

const storageMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../storage', async () => {
  const actual: typeof import('../storage') = await vi.importActual('../storage')
  return {
    ...actual,
    readPDisplayPreferences: storageMocks.read,
    writePDisplayPreferences: storageMocks.write,
  }
})

beforeEach(() => {
  storageMocks.read.mockReset().mockResolvedValue({
    dialogueComposerVisible: false,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  storageMocks.write.mockReset().mockResolvedValue(undefined)
})

it('should start hidden and restore stored dialogue composer visibility', async () => {
  storageMocks.read.mockResolvedValueOnce({
    dialogueComposerVisible: true,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})

  expect(result?.dialogueComposerVisible()).toBe(false)
  expect(result?.isReady()).toBe(false)
  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  expect(result?.dialogueComposerVisible()).toBe(true)
})

it('should persist the latest dialogue composer visibility choice', async () => {
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})

  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  result?.onDialogueComposerVisibleChange(true)

  expect(result?.dialogueComposerVisible()).toBe(true)
  expect(storageMocks.write).toHaveBeenCalledWith({
    dialogueComposerVisible: true,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
})

it('should not overwrite a newer choice when restoration finishes late', async () => {
  let completeRead: (preferences: PDisplayPreferences) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})

  result?.onDialogueComposerVisibleChange(true)
  completeRead({
    dialogueComposerVisible: false,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })

  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  expect(result?.dialogueComposerVisible()).toBe(true)
  expect(storageMocks.write).toHaveBeenCalledWith({
    dialogueComposerVisible: true,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
})

it('should ignore a pending restoration after cleanup', async () => {
  let completeRead: (preferences: PDisplayPreferences) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  const {result, cleanup} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})

  cleanup()
  completeRead({
    dialogueComposerVisible: true,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  await Promise.resolve()
  await Promise.resolve()

  expect(result?.isReady()).toBe(false)
  expect(result?.dialogueComposerVisible()).toBe(false)
  expect(storageMocks.write).not.toHaveBeenCalled()
})

it('should show the tour by default and persist hiding it without changing the composer', async () => {
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})
  expect(result?.tourButtonVisible()).toBe(true)
  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  result?.onTourButtonVisibleChange(false)
  expect(result?.tourButtonVisible()).toBe(false)
  expect(storageMocks.write).toHaveBeenCalledWith({
    dialogueComposerVisible: false,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: false,
  })
})

it('should show the feature request button by default and persist hiding it', async () => {
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})

  expect(result?.featureRequestVisible()).toBe(true)
  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  result?.onFeatureRequestVisibleChange(false)

  expect(result?.featureRequestVisible()).toBe(false)
  expect(storageMocks.write).toHaveBeenCalledWith(
    expect.objectContaining({featureRequestVisible: false}),
  )
})

it('should keep one whole preference edited during loading', async () => {
  let completeRead: (value: {
    dialogueComposerVisible: boolean
    featureRequestVisible: boolean
    playerVisible: boolean
    pomodoroVisible: boolean
    toolsButtonVisible: true
    memoryAssistVisible: true
    tourButtonVisible: boolean
  }) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})
  result?.onTourButtonVisibleChange(false)
  completeRead({
    dialogueComposerVisible: true,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  expect(result?.dialogueComposerVisible()).toBe(false)
  expect(result?.tourButtonVisible()).toBe(false)
  expect(storageMocks.write).toHaveBeenCalledWith({
    dialogueComposerVisible: false,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: false,
  })
})

it('should preserve toolbar choices changed during restoration and persist both fields', async () => {
  let complete: (value: PDisplayPreferences) => void = () => undefined
  storageMocks.read.mockReturnValueOnce(
    new Promise<PDisplayPreferences>((resolve) => {
      complete = resolve
    }),
  )
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})
  expect(result?.toolsButtonVisible()).toBe(true)
  expect(result?.memoryAssistVisible()).toBe(true)
  result?.onToolsButtonVisibleChange(false)
  result?.onMemoryAssistVisibleChange(false)
  complete({
    dialogueComposerVisible: false,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  expect(result?.toolsButtonVisible()).toBe(false)
  expect(result?.memoryAssistVisible()).toBe(false)
  expect(storageMocks.write).toHaveBeenLastCalledWith({
    dialogueComposerVisible: false,
    featureRequestVisible: true,
    memoryAssistVisible: false,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: false,
    tourButtonVisible: true,
  })
})

it('should keep widget choices made during restoration and persist them', async () => {
  let complete: (value: PDisplayPreferences) => void = () => undefined
  storageMocks.read.mockReturnValueOnce(
    new Promise<PDisplayPreferences>((resolve) => {
      complete = resolve
    }),
  )
  const {result} = renderHook(usePDisplayPreferences, {wrapper: PreferenceProvider})
  result?.onPlayerVisibleChange(false)
  result?.onPomodoroVisibleChange(false)
  complete({
    dialogueComposerVisible: false,
    featureRequestVisible: true,
    memoryAssistVisible: true,
    playerVisible: true,
    pomodoroVisible: true,
    toolsButtonVisible: true,
    tourButtonVisible: true,
  })
  await vi.waitFor(() => expect(result?.isReady()).toBe(true))
  expect(result?.playerVisible()).toBe(false)
  expect(result?.pomodoroVisible()).toBe(false)
  expect(storageMocks.write).toHaveBeenLastCalledWith(
    expect.objectContaining({playerVisible: false, pomodoroVisible: false}),
  )
  result?.onPlayerVisibleChange(true)
  await vi.waitFor(() => expect(storageMocks.write).toHaveBeenCalledTimes(2))
  expect(storageMocks.write).toHaveBeenLastCalledWith(
    expect.objectContaining({playerVisible: true, pomodoroVisible: false}),
  )
})
