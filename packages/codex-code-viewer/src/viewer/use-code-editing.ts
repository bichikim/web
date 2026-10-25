import {type Accessor, batch, createMemo, createSignal} from 'solid-js'
import {type CodeDocument, type CodeSource, type ViewerSession} from '../shared/contracts'
import {isNavigableFile} from '../shared/is-navigable-file'
import {isEditableFile} from '../shared/is-editable-file'
import {saveCodeSource} from './save-code-source'
import {errorMessage} from './error-message'
import type {ViewerPort} from './types'
import {useUnsavedChanges} from './use-unsaved-changes'
import {shareCodeChanges} from './share-code-changes'
import {useEditingDrafts} from './drafts/use-editing-drafts'
import type {EditingDraft as Draft} from './drafts/types'

interface EditingOptions {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerSession | null>
  readonly onSaved?: (value: ViewerSession) => void
  readonly onDiscardDeleted?: (value: ViewerSession) => void
}
const keyOf = (value: ViewerSession): string =>
  JSON.stringify([value.session, value.workspace, value.document.location.path])
const changed = (draft: Draft): boolean => draft.deleted || draft.source !== draft.base.source
const analysisSources = (
  entries: readonly (readonly [string, Draft])[],
  workspace: string | undefined,
): CodeSource[] =>
  entries
    .filter(
      ([, value]) =>
        value.session.workspace === workspace && isNavigableFile(value.base.location.path),
    )
    .map(([, value]) => ({path: value.base.location.path, source: value.source}))

const retainedDocument = (
  drafts: Readonly<Record<string, Draft>>,
  session: ViewerSession | null,
  workspace: string | undefined,
  path: string,
): CodeDocument | undefined => {
  const draft = drafts[JSON.stringify([session?.session, workspace, path])]
  return draft !== undefined && changed(draft) ? {...draft.base, lines: []} : undefined
}

interface DraftChangesOptions {
  readonly draft: Draft | undefined
  readonly port: ViewerPort
  readonly feedback: (message: string) => void
}
const shareDraftChanges = ({draft, port, feedback}: DraftChangesOptions): Promise<void> =>
  draft === undefined
    ? Promise.resolve()
    : shareCodeChanges({
        onError: (error) => feedback(errorMessage(error)),
        onNotice: feedback,
        original: draft.deleted ? '' : draft.base.source,
        port,
        revision: draft.base.revision,
        session: draft.session,
        source: draft.source,
      })

const editableDocument = (document: CodeDocument | undefined): boolean =>
  document !== undefined && document.readOnly !== true && isEditableFile(document.location.path)

/** Retains per-file drafts and revision-checked explicit saves until they are saved or discarded. */
export const useCodeEditing = (options: EditingOptions) => {
  const [enabled, setEnabled] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  const [feedback, setFeedback] = createSignal<string | null>(null)
  const retained = useEditingDrafts({onError: setFeedback, storage: options.port.draftStorage})
  const {drafts} = retained
  let writing: Promise<boolean> | null = null
  let writingKey: string | null = null
  let writingSource: string | undefined
  const current = createMemo(() => {
    const value = options.session()
    return value === null ? undefined : drafts()[keyOf(value)]
  })
  const pendingDrafts = createMemo(() =>
    Object.entries(drafts()).filter(([, value]) => changed(value)),
  )
  const dirty = (): boolean => current() !== undefined && changed(current()!)
  const editable = (): boolean => editableDocument(options.session()?.document)
  const change = (source: string): void => {
    const value = options.session()
    if (value === null || !editable()) {
      return
    }
    retained.change(value, source)
  }
  const saveDraft = async (key: string): Promise<boolean> => {
    const draft = drafts()[key]
    if (draft === undefined || !changed(draft)) {
      return true
    }
    setSaving(true)
    setFeedback(null)
    try {
      const result = await saveCodeSource({
        input: {
          path: draft.base.location.path,
          revision: draft.deleted ? null : draft.base.revision,
          session: draft.session.session,
          source: draft.source,
        },
        onMissing: () => markDeleted(draft.session),
        port: options.port,
      })
      const session = {...draft.session, document: result.document}
      batch(() => {
        setFeedback('저장했습니다.')
        retained.saved(session)
        options.onSaved?.(session)
      })
      return true
    } catch (error) {
      setFeedback(errorMessage(error))
      return false
    } finally {
      setSaving(false)
    }
  }
  const saveKey = (key: string): Promise<boolean> => {
    if (writing !== null) {
      return writingKey === key && writingSource === drafts()[key]?.source
        ? writing
        : writing.then(() => saveKey(key))
    }
    writingKey = key
    writingSource = drafts()[key]?.source
    writing = saveDraft(key).finally(() => {
      writing = null
    })
    return writing
  }
  const save = (): Promise<boolean> => {
    const value = options.session()
    return value === null ? Promise.resolve(false) : saveKey(keyOf(value))
  }
  const discard = (): void => {
    const value = options.session()
    if (value !== null && !saving()) {
      const key = keyOf(value)
      const deleted = drafts()[key]?.deleted === true
      batch(() => {
        setFeedback(null)
        retained.discard(value)
        if (deleted) {
          options.onDiscardDeleted?.(value)
        }
      })
    }
  }
  const accept = (value: ViewerSession): void => {
    if (retained.accept(value)) {
      setEnabled(true)
    }
  }

  const markDeleted = (value: ViewerSession): void => {
    if (!editableDocument(value.document)) {
      return
    }
    retained.markDeleted(value)
  }
  const saveDeleted = (value: ViewerSession): Promise<boolean> => {
    if (!editableDocument(value.document)) {
      return Promise.resolve(false)
    }
    markDeleted(value)
    return saveKey(keyOf(value))
  }
  const protection = useUnsavedChanges({
    discardAll: retained.clear,
    pending: () => pendingDrafts().length > 0,
    saveAll: () =>
      pendingDrafts().reduce(
        async (previous, [key]) => ((await previous) ? saveKey(key) : false),
        Promise.resolve(true),
      ),
    saving,
    settle: () => writing ?? Promise.resolve(),
  })
  return {
    accept,
    change,
    changeDeleted: (value: ViewerSession, source: string): void => {
      if (editableDocument(value.document)) {
        retained.changeDeleted(value, source)
      }
    },
    ...protection,
    deleted: () => current()?.deleted ?? false,
    dirty,
    discard,
    dismissFeedback: () => setFeedback(null),
    draftDocument: (workspace: string | undefined, path: string) =>
      retainedDocument(drafts(), options.session(), workspace, path),
    editable,
    enabled,
    feedback,
    markDeleted,
    pendingFiles: () => pendingDrafts().map(([, value]) => value.base.location.path),
    restoreDrafts: retained.restore,
    revision: () => current()?.base.revision ?? options.session()?.document.revision ?? '',
    save,
    saveDeleted,
    saving,
    shareChanges: () =>
      shareDraftChanges({draft: current(), feedback: setFeedback, port: options.port}),
    source: (): string => current()?.source ?? options.session()?.document.source ?? '',
    sourceFor: retained.sourceFor,
    sources: () => analysisSources(pendingDrafts(), options.session()?.workspace),
    toggle: () => setEnabled((previous) => !previous),
  }
}
