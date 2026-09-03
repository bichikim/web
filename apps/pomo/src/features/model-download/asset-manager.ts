import {isSupertonicModelDownloaded, type SupertonicModelId} from '../supertonic'
import {isTextModelDownloaded} from '../text-generation'
import type {ModelDownloadController, ModelDownloadTarget} from './controller'

export interface RunAfterModelOptions<Value> {
  readonly downloadIfMissing?: boolean
  readonly target: ModelDownloadTarget
  readonly task: () => Promise<Value>
}

export interface RunAfterVoiceModelOptions<Value> {
  readonly downloadIfMissing?: boolean
  readonly modelId: SupertonicModelId
  readonly task: () => Promise<Value>
}

interface CompletedModelAssetTask<Value> {
  readonly status: 'complete'
  readonly value: Value
}

interface CancelledModelAssetTask {
  readonly status: 'cancelled'
}

interface FailedModelAssetTask {
  readonly message: string
  readonly status: 'error'
}

interface MissingModelAssetTask {
  readonly status: 'missing'
}

export type RunAfterModelResult<Value> =
  | CancelledModelAssetTask
  | CompletedModelAssetTask<Value>
  | FailedModelAssetTask
  | MissingModelAssetTask

export interface ModelAssetManager {
  readonly runAfterModel: <Value>(
    options: RunAfterModelOptions<Value>,
  ) => Promise<RunAfterModelResult<Value>>
  readonly runAfterVoiceModel: <Value>(
    options: RunAfterVoiceModelOptions<Value>,
  ) => Promise<RunAfterModelResult<Value>>
}

export interface CreateModelAssetManagerOptions {
  readonly controller: ModelDownloadController
  readonly isModelDownloaded?: (target: ModelDownloadTarget) => Promise<boolean>
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.length > 0
    ? error.message
    : '모델 자산 작업을 실행하지 못했어요.'

/** Runs a waiting task after a model asset is present, joining an active download when possible. */
export const createModelAssetManager = (
  options: CreateModelAssetManagerOptions,
): ModelAssetManager => {
  const checkModel =
    options.isModelDownloaded ??
    ((target: ModelDownloadTarget) => {
      switch (target.kind) {
        case 'text':
          return isTextModelDownloaded({modelId: target.modelId})
        case 'voice':
          return isSupertonicModelDownloaded({modelId: target.modelId})
      }
    })

  const startModel = (target: ModelDownloadTarget) => {
    switch (target.kind) {
      case 'text':
        return options.controller.startTextModel(target.modelId)
      case 'voice':
        return options.controller.startVoiceModel(target.modelId)
    }
  }

  const runAfterModel = async <Value>(
    taskOptions: RunAfterModelOptions<Value>,
  ): Promise<RunAfterModelResult<Value>> => {
    let downloaded: boolean

    try {
      downloaded = await checkModel(taskOptions.target)
    } catch (error: unknown) {
      return {message: getErrorMessage(error), status: 'error'}
    }

    if (!downloaded) {
      if (taskOptions.downloadIfMissing === false) {
        return {status: 'missing'}
      }

      const downloadResult = await startModel(taskOptions.target)

      switch (downloadResult.status) {
        case 'cancelled':
          return downloadResult
        case 'error':
          return downloadResult
        case 'complete':
          break
      }
    }

    try {
      return {status: 'complete', value: await taskOptions.task()}
    } catch (error: unknown) {
      return {message: getErrorMessage(error), status: 'error'}
    }
  }

  const runAfterVoiceModel = <Value>(taskOptions: RunAfterVoiceModelOptions<Value>) =>
    runAfterModel({
      downloadIfMissing: taskOptions.downloadIfMissing,
      target: {kind: 'voice', modelId: taskOptions.modelId},
      task: taskOptions.task,
    })

  return {runAfterModel, runAfterVoiceModel}
}
