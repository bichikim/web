import {expect, it, vi} from 'vitest'

import {isSupertonicModelDownloaded} from '../../supertonic'
import {isTextModelDownloaded} from '../../text-generation'
import type {ModelDownloadController} from '../controller'
import {createModelAssetManager} from '../asset-manager'

vi.mock('../../supertonic', () => ({isSupertonicModelDownloaded: vi.fn()}))
vi.mock('../../text-generation', () => ({isTextModelDownloaded: vi.fn()}))

const createController = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  downloads: () => [],
  startImageModel: vi.fn(),
  startTextModel: vi.fn(),
  startVoiceModel: vi.fn(),
  state: () => ({status: 'idle'}),
})

it('should run the waiting task immediately when the voice model is already downloaded', async () => {
  const task = vi.fn(async () => 'audio')
  const controller = createController()
  const manager = createModelAssetManager({
    controller,
    isModelDownloaded: vi.fn(async () => true),
  })

  await expect(manager.runAfterVoiceModel({modelId: 'full', task})).resolves.toEqual({
    status: 'complete',
    value: 'audio',
  })
  expect(controller.startVoiceModel).not.toHaveBeenCalled()
  expect(task).toHaveBeenCalledOnce()
})

it('should use the default readiness checks for voice and text assets', async () => {
  const controller = createController()
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValueOnce(true)
  vi.mocked(isTextModelDownloaded).mockResolvedValueOnce(true)
  const manager = createModelAssetManager({controller})

  await expect(
    manager.runAfterModel({target: {kind: 'voice', modelId: 'full'}, task: async () => 'voice'}),
  ).resolves.toEqual({status: 'complete', value: 'voice'})
  await expect(
    manager.runAfterModel({
      target: {kind: 'text', modelId: 'gemma-4-e2b'},
      task: async () => 'text',
    }),
  ).resolves.toEqual({status: 'complete', value: 'text'})
  expect(isSupertonicModelDownloaded).toHaveBeenCalledWith({modelId: 'full'})
  expect(isTextModelDownloaded).toHaveBeenCalledWith({modelId: 'gemma-4-e2b'})
})

it('should download the missing model and run the waiting task after completion', async () => {
  const task = vi.fn(async () => 'audio')
  const controller = createController()
  vi.mocked(controller.startVoiceModel).mockResolvedValue({status: 'complete'})
  const manager = createModelAssetManager({
    controller,
    isModelDownloaded: vi.fn(async () => false),
  })

  await expect(manager.runAfterVoiceModel({modelId: 'int8', task})).resolves.toEqual({
    status: 'complete',
    value: 'audio',
  })
  expect(controller.startVoiceModel).toHaveBeenCalledWith('int8')
  expect(task).toHaveBeenCalledOnce()
})

it('should report a missing model without downloading when the caller has not confirmed it', async () => {
  const task = vi.fn(async () => 'audio')
  const controller = createController()
  const manager = createModelAssetManager({
    controller,
    isModelDownloaded: vi.fn(async () => false),
  })

  await expect(
    manager.runAfterVoiceModel({downloadIfMissing: false, modelId: 'int8', task}),
  ).resolves.toEqual({status: 'missing'})
  expect(controller.startVoiceModel).not.toHaveBeenCalled()
  expect(task).not.toHaveBeenCalled()
})

it('should route a generic text model task through the shared asset manager', async () => {
  const task = vi.fn(async () => 'draft')
  const controller = createController()
  vi.mocked(controller.startTextModel).mockResolvedValue({status: 'complete'})
  const manager = createModelAssetManager({
    controller,
    isModelDownloaded: vi.fn(async () => false),
  })

  await expect(
    manager.runAfterModel({target: {kind: 'text', modelId: 'gemma-4-e2b'}, task}),
  ).resolves.toEqual({status: 'complete', value: 'draft'})
  expect(controller.startTextModel).toHaveBeenCalledWith('gemma-4-e2b')
})

it('should not run the waiting task when the model download is cancelled or fails', async () => {
  const task = vi.fn(async () => 'audio')
  const controller = createController()
  vi.mocked(controller.startVoiceModel).mockResolvedValueOnce({status: 'cancelled'})
  const manager = createModelAssetManager({
    controller,
    isModelDownloaded: vi.fn(async () => false),
  })

  await expect(manager.runAfterVoiceModel({modelId: 'full', task})).resolves.toEqual({
    status: 'cancelled',
  })
  expect(task).not.toHaveBeenCalled()

  vi.mocked(controller.startVoiceModel).mockResolvedValueOnce({
    message: 'download failed',
    status: 'error',
  })
  await expect(manager.runAfterVoiceModel({modelId: 'full', task})).resolves.toEqual({
    message: 'download failed',
    status: 'error',
  })
})

it('should translate model inspection and waiting-task failures', async () => {
  const controller = createController()
  const manager = createModelAssetManager({
    controller,
    isModelDownloaded: vi.fn(async () => {
      throw new Error('storage unavailable')
    }),
  })

  await expect(
    manager.runAfterVoiceModel({modelId: 'full', task: async () => 'audio'}),
  ).resolves.toEqual({message: 'storage unavailable', status: 'error'})

  const taskError = new Error('generation failed')
  const taskManager = createModelAssetManager({
    controller,
    isModelDownloaded: vi.fn(async () => true),
  })
  await expect(
    taskManager.runAfterVoiceModel({
      modelId: 'full',
      task: async () => {
        throw taskError
      },
    }),
  ).resolves.toEqual({message: 'generation failed', status: 'error'})
})
