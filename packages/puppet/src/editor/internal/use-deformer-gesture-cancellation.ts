import {batch, createEffect, createMemo, on, onCleanup, untrack} from 'solid-js'
import type {PuppetParameterValues} from '../../deformation'
import type {PuppetDocument} from '../../player'
import type {DeformerEditMode} from './DeformerMode'

export interface UseDeformerGestureCancellationProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activeNodeId?: string
  readonly deformerMode?: DeformerEditMode
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly targetNodeIds?: ReadonlyArray<string>
}

export const useDeformerGestureCancellation = (
  props: UseDeformerGestureCancellationProps,
  cancel: () => void,
) => {
  let expectedDocument = untrack(() => props.document)
  const context = createMemo(() =>
    JSON.stringify([
      props.activeNodeId,
      props.activeBindingId,
      props.activeKeyformValues,
      props.deformerMode,
      props.editMode,
      props.targetNodeIds,
    ]),
  )
  createEffect(on(context, () => cancel()))
  createEffect(
    on(
      () => props.document,
      (document) => {
        if (document !== expectedDocument) {
          cancel()
        }
        expectedDocument = document
      },
    ),
  )
  onCleanup(cancel)
  return {
    changeDocument: (document: PuppetDocument) =>
      batch(() => {
        props.onDocumentChange?.(document)
        expectedDocument = untrack(() => props.document)
      }),
  }
}
