import type {
  DocumentRecovery,
  ModelBinding,
  PuppetExampleDocument,
} from '@winter-love/puppet/editor'
import type {PuppetDocument} from '@winter-love/puppet/player'
import type {DocumentSession} from './create-document-session'
import {PoffoEditor} from './editor/PoffoEditor'
import {useWorkspace} from './workspace/context'

export interface EditorAppProps {
  /** Receives a snapshot after the native file writer has completed. */
  readonly onDocumentSaved?: (document: PuppetDocument) => void | Promise<void>
  /** Optional backend projection; omitted, compose a local browser backend. Fixed for this workspace. */
  readonly model?: ModelBinding
  /** Optional existing editor recovery store; omitted to retain the default browser store. */
  readonly session?: DocumentSession
  /** Optional menu examples. */
  readonly examples?: ReadonlyArray<PuppetExampleDocument>
  /** Initial selected motion; omitted to select the first motion. */
  readonly initialMotionId?: string
  /** Initial local mode; omitted for modeling. */
  readonly initialWorkspace?: 'animation' | 'modeling'
  /** Initial model used when recovery storage is empty or unavailable. */
  readonly loadInitialDocument: () => Promise<PuppetDocument>
}

export interface DocumentEditorProps extends EditorAppProps {
  readonly model: ModelBinding
  readonly recovery: DocumentRecovery
}

export const EditorApp = (props: DocumentEditorProps) => {
  const workspace = useWorkspace()
  return (
    <PoffoEditor
      model={props.model}
      onDocumentSaved={props.onDocumentSaved}
      examples={props.examples}
      recovery={props.recovery}
      initialMotionId={props.initialMotionId}
      initialWorkspace={props.initialWorkspace}
      active={workspace?.active() !== false && workspace?.mode() === 'editor'}
    />
  )
}
