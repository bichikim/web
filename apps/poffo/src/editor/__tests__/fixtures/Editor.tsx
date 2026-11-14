import {createEffect, on, untrack} from 'solid-js'
import type {DocumentRecovery, EditorController} from '@winter-love/puppet/editor'
import {createEmptyDocument, type PuppetDocument} from '@winter-love/puppet/player'
import {PoffoEditor} from '../../PoffoEditor'
import {createModelSession} from '../../../model/create-model-session'

interface EditorFixtureProps {
  readonly onControl?: (control: EditorController) => void
  readonly initialDocument?: PuppetDocument
  readonly replacementDocument?: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onDocumentCommit?: (document: PuppetDocument) => void
  readonly initialWorkspace?: 'animation' | 'modeling'
  readonly initialMotionId?: string
  readonly recovery?: DocumentRecovery
}

/** Gives integration scenarios a real Poffo host instead of restoring ownership to Puppet. */
export const EditorFixture = (props: EditorFixtureProps) => {
  const model = createModelSession({
    document: untrack(() => props.initialDocument ?? createEmptyDocument()),
    onCommit: (document) => props.onDocumentCommit?.(document),
    sessionId: 'integration-model',
  })
  createEffect(on(model.document, (document) => props.onDocumentChange?.(document)))
  createEffect(
    on(
      () => props.replacementDocument,
      (document) => {
        if (document !== undefined) {
          model.request({
            document,
            expectedRevision: model.read().revision,
            ownerId: 'integration-host',
            requestId: 'replacement',
            type: 'replace',
          })
        }
      },
    ),
  )
  return (
    <PoffoEditor
      model={model}
      initialWorkspace={props.initialWorkspace}
      initialMotionId={props.initialMotionId}
      recovery={props.recovery}
      onControl={props.onControl}
    />
  )
}
