import {type Accessor, batch, createMemo, createSignal} from 'solid-js'
import {z} from 'zod'
import {
  type CodeDocument,
  type CodeSource,
  documentSchema,
  type ViewerSession,
} from '../shared/contracts'
import {isNavigableFile} from '../shared/is-navigable-file'
import {isEditableFile} from '../shared/is-editable-file'
import {callViewerTool} from './call-viewer-tool'
import {errorMessage} from './error-message'
import type {ViewerPort} from './types'
import {useUnsavedChanges} from './use-unsaved-changes'
import {shareCodeChanges} from './share-code-changes'

interface Draft {
  readonly base: CodeDocument
  readonly source: string
  readonly session: ViewerSession
}
interface EditingOptions {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerSession | null>
  readonly onSaved?: (value: ViewerSession) => void
}
const keyOf = (value: ViewerSession): string =>
  JSON.stringify([value.workspace, value.document.location.path])
const changed = (draft: Draft): boolean => draft.source !== draft.base.source
const omitDraft = (drafts: Readonly<Record<string, Draft>>, key: string) =>
  Object.fromEntries(Object.entries(drafts).filter(([entry]) => entry !== key))
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
  const source = (): string => current()?.source ?? options.session()?.document.source ?? ''
  const editable = (): boolean => isEditableFile(options.session()?.document.location.path ?? '')
  const change = (source: string): void => {
    const value = options.session()
    if (value === null || !editable()) {
      return
    }
    const key = keyOf(value)
    setDrafts((previous) => ({
      ...previous,
      [key]: {
        base: previous[key]?.base ?? value.document,
        session: value,
        source,
      },
    }))
  }
  const saveDraft = async (key: string): Promise<boolean> => {
    const draft = drafts()[key]
    if (draft === undefined || !changed(draft)) {
      return true
    }
    setSaving(true)
    setFeedback(null)
    try {
      const result = await callViewerTool({
        input: {
          path: draft.base.location.path,
          revision: draft.base.revision,
          session: draft.session.session,
          source: draft.source,
        },
        name: 'code.write',
        port: options.port,
        schema: z.object({document: documentSchema}),
      })
      const session = {...draft.session, document: result.document}
      batch(() => {
        setDrafts((previous) => ({
          ...previous,
          [key]: {base: result.document, session, source: previous[key]?.source ?? draft.source},
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
      setDrafts((previous) => omitDraft(previous, key))
      setFeedback(null)
    }
  }
  const accept = (value: ViewerSession): void => {
    const key = keyOf(value)
    const draft = drafts()[key]
    if (draft !== undefined && !changed(draft)) {
      setDrafts((previous) => omitDraft(previous, key))
    }
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
    dirty,
    discard,
    dismissFeedback: () => setFeedback(null),
    editable,
    enabled,
    feedback,
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
            original: draft.base.source,
            port: options.port,
            revision: draft.base.revision,
            session: draft.session,
            source: draft.source,
          })
    },
    source,
    sources: () => analysisSources(pendingDrafts(), options.session()?.workspace),
    toggle: () => setEnabled((previous) => !previous),
  }
}
