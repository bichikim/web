/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {ModelDownloadController, ModelDownloadRuntime} from '../controller'

const controllerMocks = vi.hoisted(() => ({createModelDownloadController: vi.fn()}))

vi.mock('../controller', async () => {
  const actual = await vi.importActual<typeof import('../controller')>('../controller')
  return {...actual, createModelDownloadController: controllerMocks.createModelDownloadController}
})

import {PModelDownloadProvider, useModelDownload} from '../PModelDownloadProvider'

it('should require the model download provider', () => {
  expect(() => useModelDownload()).toThrow(
    'useModelDownload must be used inside PModelDownloadProvider.',
  )
})

it('should provide one controller and dispose it on cleanup', () => {
  const dispose = vi.fn()
  const controller = {dispose} as unknown as ModelDownloadController
  const runtime = {} as ModelDownloadRuntime
  controllerMocks.createModelDownloadController.mockReturnValue(controller)
  let observedController: ModelDownloadController | undefined
  const Consumer = () => {
    observedController = useModelDownload()
    return null
  }

  const result = render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <Consumer />
    </PModelDownloadProvider>
  ))

  expect(controllerMocks.createModelDownloadController).toHaveBeenCalledWith(runtime)
  expect(observedController).toBe(controller)
  result.unmount()
  expect(dispose).toHaveBeenCalledOnce()
})
