/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {type PSceneStyle, type PSceneStyleController, usePSceneStyle} from '../index'

const storageMocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../style-storage', () => ({
  readPSceneStyle: storageMocks.read,
  writePSceneStyle: storageMocks.write,
}))

interface SceneStyleHarnessProps {
  readonly onController: (controller: PSceneStyleController) => void
}

const SceneStyleHarness = (props: SceneStyleHarnessProps) => {
  const controller = usePSceneStyle()
  props.onController(controller)

  return null
}

beforeEach(() => {
  storageMocks.read.mockReset().mockResolvedValue('scribble')
  storageMocks.write.mockReset().mockResolvedValue(undefined)
})

it('should restore the stored scene style after mounting', async () => {
  let controller: PSceneStyleController | undefined

  render(() => (
    <SceneStyleHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  expect(controller?.isReady()).toBe(false)
  await vi.waitFor(() => expect(controller?.sceneStyle()).toBe('scribble'))
  expect(controller?.isReady()).toBe(true)
})

it('should update and persist both scene style choices', () => {
  let controller: PSceneStyleController | undefined

  render(() => (
    <SceneStyleHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  controller?.onSceneStyleChange('original')
  expect(controller?.isReady()).toBe(true)
  expect(controller?.sceneStyle()).toBe('original')
  expect(storageMocks.write).toHaveBeenLastCalledWith('original')

  controller?.onSceneStyleChange('scribble')
  expect(controller?.sceneStyle()).toBe('scribble')
  expect(storageMocks.write).toHaveBeenLastCalledWith('scribble')
})

it('should not overwrite a newer choice when stored style restoration finishes late', async () => {
  let completeRead: (sceneStyle: PSceneStyle) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  let controller: PSceneStyleController | undefined

  render(() => (
    <SceneStyleHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  controller?.onSceneStyleChange('original')
  completeRead('scribble')

  await Promise.resolve()
  expect(controller?.sceneStyle()).toBe('original')
})

it('should ignore stored style restoration after cleanup', async () => {
  let completeRead: (sceneStyle: PSceneStyle) => void = () => undefined
  storageMocks.read.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  let controller: PSceneStyleController | undefined
  const result = render(() => (
    <SceneStyleHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  result.unmount()
  completeRead('scribble')
  await Promise.resolve()

  expect(controller?.sceneStyle()).toBe('original')
  expect(controller?.isReady()).toBe(false)
})
