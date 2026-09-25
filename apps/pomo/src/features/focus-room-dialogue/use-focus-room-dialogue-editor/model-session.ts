import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {getDownloadPercentage} from 'src/features/download-progress'
import type {Accessor} from 'solid-js'

import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  type SupertonicClient,
  type SupertonicModelId,
} from '../../supertonic'
import type {DialogueEditorState} from '../dialogue-editor-state'

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
  totalBytes > 0 ? getDownloadPercentage(loadedBytes, totalBytes) : 0

/** Owns the disposable Supertonic client used by one dialogue editor. */
export const createDialogueModelSession = (
  options: CreateDialogueModelSessionOptions,
): DialogueModelSession => {
  let client: SupertonicClient | null = null
  let preparedModelId: SupertonicModelId | null = null
  let isPreparing = false

  const invalidate = () => {
    isPreparing = false
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
        options.setState({message: m.dialogue_status_model_start_failed(), status: 'error'})
        return null
      }

      client = nextClient
      isPreparing = true
      options.setState({
        message: m.dialogue_status_model_checking(),
        progress: 0,
        status: 'preparing',
      })

      try {
        const result = await nextClient.initialize({
          modelId,
          onProgress: (progress) => {
            if (isPreparing && client === nextClient && !options.isDisposed()) {
              options.setState({
                message: m.dialogue_status_model_file_preparing({
                  fileName: getLocale() === 'en' ? 'voice model file' : progress.fileName,
                }),
                progress: getProgress(progress.loadedBytes, progress.totalBytes),
                status: 'preparing',
              })
            }
          },
          onStatus: (message) => {
            if (isPreparing && client === nextClient && !options.isDisposed()) {
              options.setState({
                ...options.state(),
                message: getLocale() === 'en' ? m.dialogue_status_model_status() : message,
              })
            }
          },
        })

        if (client !== nextClient || options.isDisposed()) {
          return null
        }

        isPreparing = false

        if (!result.ok) {
          options.setState({message: getSupertonicErrorMessage(result.error), status: 'error'})
          return null
        }
      } catch (error: unknown) {
        if (client !== nextClient || options.isDisposed()) {
          return null
        }

        isPreparing = false
        console.error('Failed to prepare focus room dialogue model.', error)
        options.setState({message: m.dialogue_status_model_prepare_failed(), status: 'error'})
        return null
      }

      preparedModelId = modelId
      return nextClient
    },
  }
}
