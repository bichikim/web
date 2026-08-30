import type {Accessor} from 'solid-js'

import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  type SupertonicClient,
  type SupertonicModelId,
} from '../../supertonic'
import type {DialogueEditorState} from '../dialogue-editor-state'

const MAXIMUM_PROGRESS = 100

export interface CreateDialogueModelSessionOptions {
  readonly isDisposed: () => boolean
  readonly setState: (state: DialogueEditorState) => void
  readonly state: Accessor<DialogueEditorState>
}

export interface DialogueModelSession {
  readonly dispose: () => void
  readonly getClient: () => SupertonicClient | null
  readonly getPreparedModelId: () => SupertonicModelId | null
  readonly invalidate: () => void
  readonly isCurrent: (client: SupertonicClient) => boolean
  readonly prepare: (modelId: SupertonicModelId) => Promise<SupertonicClient | null>
}

const getProgress = (loadedBytes: number, totalBytes: number) =>
  Math.min(MAXIMUM_PROGRESS, Math.round((loadedBytes / totalBytes) * MAXIMUM_PROGRESS))

/** Owns the disposable Supertonic client used by one dialogue editor. */
export const createDialogueModelSession = (
  options: CreateDialogueModelSessionOptions,
): DialogueModelSession => {
  let client: SupertonicClient | null = null
  let preparedModelId: SupertonicModelId | null = null

  const invalidate = () => {
    client?.dispose()
    client = null
    preparedModelId = null
  }

  return {
    dispose: invalidate,
    getClient: () => client,
    getPreparedModelId: () => preparedModelId,
    invalidate,
    isCurrent: (candidate) => client === candidate && !options.isDisposed(),
    async prepare(modelId) {
      invalidate()
      let nextClient: SupertonicClient

      try {
        nextClient = createSupertonicClient()
      } catch (error: unknown) {
        console.error('Failed to create focus room dialogue model client.', error)
        options.setState({message: '음성 모델을 시작하지 못했어요.', status: 'error'})
        return null
      }

      client = nextClient
      options.setState({message: '음성 모델을 확인하고 있어요.', progress: 0, status: 'preparing'})

      try {
        const result = await nextClient.initialize({
          modelId,
          onProgress: (progress) => {
            if (client === nextClient && !options.isDisposed()) {
              options.setState({
                message: `${progress.fileName} 준비 중…`,
                progress: getProgress(progress.loadedBytes, progress.totalBytes),
                status: 'preparing',
              })
            }
          },
          onStatus: (message) => {
            if (client === nextClient && !options.isDisposed()) {
              options.setState({...options.state(), message})
            }
          },
        })

        if (client !== nextClient || options.isDisposed()) {
          return null
        }

        if (!result.ok) {
          options.setState({message: getSupertonicErrorMessage(result.error), status: 'error'})
          return null
        }
      } catch (error: unknown) {
        if (client !== nextClient || options.isDisposed()) {
          return null
        }

        console.error('Failed to prepare focus room dialogue model.', error)
        options.setState({message: '음성 모델을 준비하지 못했어요.', status: 'error'})
        return null
      }

      preparedModelId = modelId
      return nextClient
    },
  }
}
