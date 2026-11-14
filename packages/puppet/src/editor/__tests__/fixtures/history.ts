import {renderHook} from '@solidjs/testing-library'
import {createElementModel} from '../../../editor-element/create-element-model'
import {useModelHistory} from '../../use-model-history'
import type {PuppetDocument} from '../../../player'

interface CreateHistoryOptions {
  /** Host input for the component scenario. */
  readonly initialDocument: PuppetDocument
  /** Host history limit; omitted to use its default. */
  readonly limit?: number
}

export type DocumentHistoryResult = ReturnType<typeof useModelHistory>

/** Supplies a standalone host to focused editor-component tests. */
export const createHistory = (options: CreateHistoryOptions): DocumentHistoryResult =>
  renderHook(() =>
    useModelHistory(
      createElementModel({
        document: options.initialDocument,
        limit: options.limit,
        sessionId: 'test-host',
      }),
      'test-editor',
    ),
  ).result
