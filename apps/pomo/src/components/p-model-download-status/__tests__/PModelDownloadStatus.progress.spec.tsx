/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {
  createModelDownloadController,
  type ModelDownloadController,
  type ModelDownloadRuntime,
} from '../../../features/model-download/controller'
import {ModelDownloadContext} from '../../../features/model-download/context'
import type {TextModelDownloadResponse} from '../../../features/model-download/text-client'
import {PModelDownloadStatus} from '../PModelDownloadStatus'

let controller: ModelDownloadController | undefined

const createTestRuntime = () => {
  let receiveResponse: ((response: TextModelDownloadResponse) => void) | null = null
  const runtime: ModelDownloadRuntime = {
    createTextClient: ({onResponse}) => {
      receiveResponse = onResponse
      return {dispose: vi.fn(), prepare: vi.fn()}
    },
    createVoiceClient: () => {
      throw new Error('Voice downloads are outside this test.')
    },
  }

  return {
    emit: (response: TextModelDownloadResponse) => {
      if (receiveResponse === null) {
        throw new Error('The text download client has not been created.')
      }

      receiveResponse(response)
    },
    runtime,
  }
}

const renderStatus = (runtime: ModelDownloadRuntime) => {
  render(() => {
    controller = createModelDownloadController(runtime)
    return (
      <ModelDownloadContext.Provider value={controller}>
        <PModelDownloadStatus />
      </ModelDownloadContext.Provider>
    )
  })

  if (controller === undefined) {
    throw new Error('The model download controller was not created.')
  }

  return controller
}

const createLoadingResponse = (percentage: number): TextModelDownloadResponse => ({
  files: [],
  loadedBytes: percentage,
  percentage,
  totalBytes: 100,
  type: 'loading',
})

afterEach(() => {
  controller?.dispose()
  controller = undefined
  cleanup()
})

it('should cap displayed progress while the controller stays loading until the worker is ready', async () => {
  const testRuntime = createTestRuntime()
  const currentController = renderStatus(testRuntime.runtime)
  const download = currentController.startTextModel('gemma-4-e2b')
  const onComplete = vi.fn()
  void download.then(onComplete)

  testRuntime.emit(createLoadingResponse(120))

  const [item] = currentController.downloads()
  expect(item).toMatchObject({percentage: 120, status: 'loading'})
  expect(currentController.state().status).toBe('loading')
  expect(screen.getByText('Gemma 4 E2B 모델 받는 중 · 100%')).toBeInTheDocument()
  expect(screen.getByRole('progressbar', {name: '모델 다운로드 진행률'})).toHaveAttribute(
    'aria-valuenow',
    '100',
  )
  expect(screen.getByRole('button', {name: '취소'})).toBeInTheDocument()
  await Promise.resolve()
  expect(onComplete).not.toHaveBeenCalled()

  testRuntime.emit({type: 'ready'})

  await expect(download).resolves.toEqual({status: 'complete'})
  expect(currentController.state()).toEqual({status: 'idle'})
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})

it('should display negative finite progress as zero without changing the error outcome', async () => {
  const testRuntime = createTestRuntime()
  const currentController = renderStatus(testRuntime.runtime)
  const download = currentController.startTextModel('gemma-4-e2b')

  testRuntime.emit(createLoadingResponse(-25))

  const [item] = currentController.downloads()
  expect(item).toMatchObject({percentage: -25, status: 'loading'})
  expect(currentController.state().status).toBe('loading')
  expect(screen.getByText('Gemma 4 E2B 모델 받는 중 · 0%')).toBeInTheDocument()
  expect(screen.getByRole('progressbar', {name: '모델 다운로드 진행률'})).toHaveAttribute(
    'aria-valuenow',
    '0',
  )

  testRuntime.emit({message: '다운로드 실패', restartRequired: false, type: 'error'})

  await expect(download).resolves.toEqual({message: '다운로드 실패', status: 'error'})
  expect(currentController.state()).toMatchObject({status: 'error'})
  expect(screen.getByRole('alert')).toHaveTextContent('다운로드 실패')
})

it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  'should display non-finite progress as indeterminate while the controller stays loading (%s)',
  async (percentage) => {
    const testRuntime = createTestRuntime()
    const currentController = renderStatus(testRuntime.runtime)
    const download = currentController.startTextModel('gemma-4-e2b')

    testRuntime.emit(createLoadingResponse(percentage))

    expect(currentController.state().status).toBe('loading')
    expect(screen.getByText('Gemma 4 E2B 모델 받는 중')).toBeInTheDocument()
    const progress = screen.getByRole('progressbar', {name: '모델 다운로드 진행률'})
    expect(progress).not.toHaveAttribute('aria-valuenow')
    expect(screen.queryByText(/%/u)).not.toBeInTheDocument()

    currentController.cancel()

    await expect(download).resolves.toEqual({status: 'cancelled'})
    expect(currentController.state()).toEqual({status: 'idle'})
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  },
)
