/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {type PScenePreferencesController, usePScenePreferences} from '../index'

const storageMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../storage', () => ({
  readPScenePreferences: storageMocks.read,
  writePScenePreferences: storageMocks.write,
}))

interface ScenePreferencesHarnessProps {
  readonly onController: (controller: PScenePreferencesController) => void
}

const ScenePreferencesHarness = (props: ScenePreferencesHarnessProps) => {
  const controller = usePScenePreferences()
  props.onController(controller)

  return null
}

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
  let controller: PScenePreferencesController | undefined

  render(() => (
    <ScenePreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  expect(controller?.isReady()).toBe(false)
  await vi.waitFor(() => expect(controller?.timeMode()).toBe('auto'))
  expect(controller?.activity()).toBe('typing')
  expect(controller?.gaze()).toBe('user')
  expect(controller?.isReady()).toBe(true)
})

it('should persist the complete latest snapshot after each choice', async () => {
  storageMocks.read.mockResolvedValueOnce({activity: 'reading', gaze: 'focused', timeMode: 'day'})
  let controller: PScenePreferencesController | undefined

  render(() => (
    <ScenePreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  await vi.waitFor(() => expect(controller?.isReady()).toBe(true))
  controller?.onTimeModeChange('night')
  controller?.onActivityChange('writing')
  controller?.onGazeChange('user')

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
  let controller: PScenePreferencesController | undefined

  render(() => (
    <ScenePreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  controller?.onActivityChange('writing')
  controller?.onGazeChange('focused')
  controller?.onTimeModeChange('night')
  completeRead(storedPreferences)

  await vi.waitFor(() => expect(controller?.isReady()).toBe(true))
  expect(controller?.timeMode()).toBe('night')
  expect(controller?.activity()).toBe('writing')
  expect(controller?.gaze()).toBe('focused')
  expect(storageMocks.write).toHaveBeenLastCalledWith({
    activity: 'writing',
    gaze: 'focused',
    timeMode: 'night',
  })
})

it('should ignore a pending restoration after cleanup', async () => {
  let completeRead: (preferences: typeof storedPreferences) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  let controller: PScenePreferencesController | undefined
  const result = render(() => (
    <ScenePreferencesHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  result.unmount()
  completeRead(storedPreferences)
  await Promise.resolve()
  await Promise.resolve()

  expect(controller?.isReady()).toBe(false)
  expect(controller?.activity()).not.toBe(storedPreferences.activity)
  expect(storageMocks.write).not.toHaveBeenCalled()
})
