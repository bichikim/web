/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {type PSceneStyleController, usePSceneStyle} from '../index'

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
  storageMocks.read.mockReset().mockReturnValue('scribble')
  storageMocks.write.mockReset()
})

it('should restore the stored scene style after mounting', () => {
  let controller: PSceneStyleController | undefined

  render(() => (
    <SceneStyleHarness
      onController={(nextController) => {
        controller = nextController
      }}
    />
  ))

  expect(controller?.sceneStyle()).toBe('scribble')
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
  expect(controller?.sceneStyle()).toBe('original')
  expect(storageMocks.write).toHaveBeenLastCalledWith('original')

  controller?.onSceneStyleChange('scribble')
  expect(controller?.sceneStyle()).toBe('scribble')
  expect(storageMocks.write).toHaveBeenLastCalledWith('scribble')
})
