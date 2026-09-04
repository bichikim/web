/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {type PDisplayPreferencesController, usePDisplayPreferences} from '../index'

const storageMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../storage', () => ({
  readPDisplayPreferences: storageMocks.read,
  writePDisplayPreferences: storageMocks.write,
}))

interface PreferencesHarnessProps {
  readonly onController: (controller: PDisplayPreferencesController) => void
}

const PreferencesHarness = (props: PreferencesHarnessProps) => {
  const controller = usePDisplayPreferences()
  props.onController(controller)
  return null
}

beforeEach(() => {
  storageMocks.read.mockReset().mockResolvedValue({dialogueComposerVisible: false})
  storageMocks.write.mockReset().mockResolvedValue(undefined)
})

it('should start hidden and restore stored dialogue composer visibility', async () => {
  storageMocks.read.mockResolvedValueOnce({dialogueComposerVisible: true})
  let controller: PDisplayPreferencesController | undefined

  render(() => (
    <PreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  expect(controller?.dialogueComposerVisible()).toBe(false)
  expect(controller?.isReady()).toBe(false)
  await vi.waitFor(() => expect(controller?.isReady()).toBe(true))
  expect(controller?.dialogueComposerVisible()).toBe(true)
})

it('should persist the latest dialogue composer visibility choice', async () => {
  let controller: PDisplayPreferencesController | undefined

  render(() => (
    <PreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  await vi.waitFor(() => expect(controller?.isReady()).toBe(true))
  controller?.onDialogueComposerVisibleChange(true)

  expect(controller?.dialogueComposerVisible()).toBe(true)
  expect(storageMocks.write).toHaveBeenCalledWith({dialogueComposerVisible: true})
})

it('should not overwrite a newer choice when restoration finishes late', async () => {
  let completeRead: (preferences: {dialogueComposerVisible: boolean}) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  let controller: PDisplayPreferencesController | undefined

  render(() => (
    <PreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  controller?.onDialogueComposerVisibleChange(true)
  completeRead({dialogueComposerVisible: false})

  await vi.waitFor(() => expect(controller?.isReady()).toBe(true))
  expect(controller?.dialogueComposerVisible()).toBe(true)
  expect(storageMocks.write).toHaveBeenCalledWith({dialogueComposerVisible: true})
})

it('should ignore a pending restoration after cleanup', async () => {
  let completeRead: (preferences: {dialogueComposerVisible: boolean}) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  let controller: PDisplayPreferencesController | undefined
  const result = render(() => (
    <PreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  result.unmount()
  completeRead({dialogueComposerVisible: true})
  await Promise.resolve()
  await Promise.resolve()

  expect(controller?.isReady()).toBe(false)
  expect(controller?.dialogueComposerVisible()).toBe(false)
  expect(storageMocks.write).not.toHaveBeenCalled()
})
