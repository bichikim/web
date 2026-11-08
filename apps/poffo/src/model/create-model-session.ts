import {batch, createMemo, createSignal, onCleanup} from 'solid-js'
import type {LocalModelBinding, ModelChange} from '@winter-love/puppet/model'
import type {PuppetDocument} from '@winter-love/puppet/player'
import {createModelBackend} from '../backend/create-model-backend'

export interface CreateModelSessionOptions {
  /** Identity of the shared model; retained while changing pages. */
  readonly sessionId: string
  /** Validated initial model restored by Poffo. */
  readonly document: PuppetDocument
  /** Receives completed snapshots for serialized recovery persistence; never called for previews or rollback. */
  readonly onCommit?: (document: PuppetDocument, change: ModelChange) => void
}

/** Connects the common backend to Solid readers; this view does not own another history. */
export const createModelSession = (options: CreateModelSessionOptions): LocalModelBinding => {
  const backend = createModelBackend(options)
  const [view, setView] = createSignal(backend.read())
  const document = createMemo(() => view().document)
  const revision = createMemo(() => view().revision)
  const unsubscribe = backend.subscribe(setView)
  onCleanup(unsubscribe)
  return {
    document,
    read: view,
    request: (action) => batch(() => backend.request(action)),
    revision,
  }
}
