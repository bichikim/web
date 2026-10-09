import {type Accessor, batch, createMemo, createSignal} from 'solid-js'
import {type CodeDocument, type CodeSource, type ViewerSession} from '../shared/contracts'
import {isNavigableFile} from '../shared/is-navigable-file'
import {isEditableFile} from '../shared/is-editable-file'
import {saveCodeSource} from './save-code-source'
import {errorMessage} from './error-message'
import type {ViewerPort} from './types'
import {useUnsavedChanges} from './use-unsaved-changes'
import {shareCodeChanges} from './share-code-changes'

interface Draft {
  readonly base: CodeDocument
  readonly source: string
  readonly session: ViewerSession
  readonly deleted: boolean
}
interface EditingOptions {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerSession | null>
  readonly onSaved?: (value: ViewerSession) => void
  readonly onDiscardDeleted?: (value: ViewerSession) => void
}
const keyOf = (value: ViewerSession): string =>
  JSON.stringify([value.workspace, value.document.location.path])
const changed = (draft: Draft): boolean => draft.deleted || draft.source !== draft.base.source
const editDraft = (
  drafts: Readonly<Record<string, Draft>>,
  value: ViewerSession,
  source: string,
) => {
  const key = keyOf(value)
  return {
    ...drafts,
    [key]: {
      base: drafts[key]?.base ?? value.document,
      deleted: drafts[key]?.deleted ?? false,
      session: value,
      source,
    },
  }
}
const omitDraft = (drafts: Readonly<Record<string, Draft>>, key: string) =>
  Object.fromEntries(Object.entries(drafts).filter(([entry]) => entry !== key))
const deletedDraft = (drafts: Readonly<Record<string, Draft>>, value: ViewerSession) => {
  const key = keyOf(value)
  const draft = drafts[key]
  return draft?.deleted
    ? drafts
    : {
        ...drafts,
        [key]: {
          base: draft?.base ?? value.document,
          deleted: true,
          session: value,
          source: draft?.source ?? value.document.source,
        },
      }
}
const acceptDraft = (drafts: Readonly<Record<string, Draft>>, value: ViewerSession) => {
  const key = keyOf(value)
  const draft = drafts[key]
  if (draft === undefined) {
    return drafts
  }
  return draft.source === draft.base.source
    ? omitDraft(drafts, key)
    : {...drafts, [key]: {...draft, deleted: false}}
}
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

/** Retains per-file drafts and revision-checked explicit saves until they are saved or discarded. */
export const useCodeEditing = (options: EditingOptions) => {
  const [drafts, setDrafts] = createSignal<Readonly<Record<string, Draft>>>({})
  const [enabled, setEnabled] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  const [feedback, setFeedback] = createSignal<string | null>(null)
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
  const editable = (): boolean => isEditableFile(options.session()?.document.location.path ?? '')
  const change = (source: string): void => {
    const value = options.session()
    if (value === null || !editable()) {
      return
    }
    setDrafts((previous) => editDraft(previous, value, source))
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
        setDrafts((previous) => ({
          ...previous,
          [key]: {
            base: result.document,
            deleted: false,
            session,
            source: previous[key]?.source ?? draft.source,
          },
        }))
        options.onSaved?.(session)
        setFeedback('저장했습니다.')
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
        setDrafts((previous) => omitDraft(previous, key))
        setFeedback(null)
        if (deleted) {
          options.onDiscardDeleted?.(value)
        }
      })
    }
  }
  const accept = (value: ViewerSession): void => {
    setDrafts((previous) => acceptDraft(previous, value))
  }
  const markDeleted = (value: ViewerSession): void => {
    if (!isEditableFile(value.document.location.path)) {
      return
    }
    setDrafts((previous) => deletedDraft(previous, value))
  }
  const protection = useUnsavedChanges({
    discardAll: () => setDrafts({}),
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
    ...protection,
    deleted: () => current()?.deleted ?? false,
    dirty,
    discard,
    dismissFeedback: () => setFeedback(null),
    editable,
    enabled,
    feedback,
    markDeleted,
    pendingFiles: () => pendingDrafts().map(([, value]) => value.base.location.path),
    revision: () => current()?.base.revision ?? options.session()?.document.revision ?? '',
    save,
    saving,
    shareChanges: (): Promise<void> => {
      const draft = current()
      return draft === undefined
        ? Promise.resolve()
        : shareCodeChanges({
            onError: (error) => setFeedback(errorMessage(error)),
            onNotice: setFeedback,
            original: draft.deleted ? '' : draft.base.source,
            port: options.port,
            revision: draft.base.revision,
            session: draft.session,
            source: draft.source,
          })
    },
    source: (): string => current()?.source ?? options.session()?.document.source ?? '',
    sources: () => analysisSources(pendingDrafts(), options.session()?.workspace),
    toggle: () => setEnabled((previous) => !previous),
  }
}
