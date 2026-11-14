import {createSignal} from 'solid-js'
import type {ViewerSession} from '../../shared/contracts'
import {errorMessage} from '../error-message'
import {createLocalDrafts} from './create-local-drafts'
import type {EditingDraft as Draft, DraftStorage} from './types'

interface UseEditingDraftsProps {
  readonly storage?: DraftStorage
  readonly onError: (message: string) => void
}
const keyOf = (value: ViewerSession): string =>
  JSON.stringify([value.session, value.workspace, value.document.location.path])
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
  const draft =
    drafts[key] ??
    Object.values(drafts).find(
      (entry) =>
        entry.deleted &&
        entry.session.workspace === value.workspace &&
        entry.base.location.path === value.document.location.path,
    )
  const retained = draft === undefined ? drafts : omitDraft(drafts, keyOf(draft.session))
  return draft?.deleted && draft.session.session === value.session
    ? drafts
    : {
        ...retained,
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
    : {...drafts, [key]: {...draft, deleted: false, session: value}}
}

/** Retains drafts and their original baselines, optionally recovering browser-local snapshots. */
export const useEditingDrafts = (props: UseEditingDraftsProps) => {
  const [drafts, setDrafts] = createSignal<Readonly<Record<string, Draft>>>({})
  const persistence = props.storage === undefined ? undefined : createLocalDrafts(props.storage)
  const recovered = new Set<string>()
  const update = (
    value: ViewerSession,
    transform: (previous: Readonly<Record<string, Draft>>) => Readonly<Record<string, Draft>>,
  ): void => {
    const previous = drafts()
    const next = transform(previous)
    setDrafts(next)
    try {
      const scopes = new Map(
        [value, ...Object.values(previous).map((draft) => draft.session)].map((session) => [
          JSON.stringify([session.session, session.workspace]),
          session,
        ]),
      )
      scopes.forEach((session) => persistence?.write(session, Object.values(next)))
    } catch (error) {
      props.onError(`미저장 초안 보관에 실패했습니다. ${errorMessage(error)}`)
    }
  }
  const restore = (value: ViewerSession): boolean => {
    const scope = JSON.stringify([value.session, value.workspace])
    let restoredCurrent = false
    if (!recovered.has(scope)) {
      recovered.add(scope)
      try {
        const restored = persistence?.read(value) ?? []
        setDrafts((previous) => ({
          ...Object.fromEntries(restored.map((draft) => [keyOf(draft.session), draft])),
          ...previous,
        }))
        restoredCurrent = restored.some((draft) => keyOf(draft.session) === keyOf(value))
      } catch (error) {
        props.onError(`미저장 초안 복구에 실패했습니다. ${errorMessage(error)}`)
      }
    }
    return restoredCurrent
  }
  const accept = (value: ViewerSession): boolean => {
    const restoredCurrent = restore(value)
    setDrafts((previous) => acceptDraft(previous, value))
    return restoredCurrent
  }
  const clear = (): void => {
    const sessions = new Map(
      Object.values(drafts()).map((draft) => [
        JSON.stringify([draft.session.session, draft.session.workspace]),
        draft.session,
      ]),
    )
    sessions.forEach((value) => update(value, () => ({})))
  }
  return {
    accept,
    change: (value: ViewerSession, source: string) =>
      update(value, (previous) => editDraft(previous, value, source)),
    changeDeleted: (value: ViewerSession, source: string) =>
      update(value, (previous) => editDraft(deletedDraft(previous, value), value, source)),
    clear,
    discard: (value: ViewerSession) =>
      update(value, (previous) => omitDraft(previous, keyOf(value))),
    drafts,
    markDeleted: (value: ViewerSession) =>
      update(value, (previous) => deletedDraft(previous, value)),
    restore,
    saved: (value: ViewerSession) =>
      update(value, (previous) => ({
        ...previous,
        [keyOf(value)]: {
          base: value.document,
          deleted: false,
          session: value,
          source: previous[keyOf(value)]?.source ?? value.document.source,
        },
      })),
    sourceFor: (value: ViewerSession): string =>
      drafts()[keyOf(value)]?.source ?? value.document.source,
  }
}
