import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import type {CodexActivity} from './types'
import {codexPort} from './native'

interface UseCodexTitlesProps {
  readonly activities: Accessor<readonly CodexActivity[]>
  readonly read?: (sessionId: string) => Promise<string | null>
}
/** Reads chat names without resuming conversations; older reads cannot replace newer names. */
export const useCodexTitles = (props: UseCodexTitlesProps) => {
  const [titles, setTitles] = createSignal<ReadonlyMap<string, string | null>>(new Map())
  const requested = new Map<string, number>()
  let disposed = false
  const request = (item: CodexActivity, read: NonNullable<UseCodexTitlesProps['read']>) => {
    if (item.title !== undefined || requested.get(item.sessionId) === item.notificationId) {
      return
    }
    requested.set(item.sessionId, item.notificationId)
    read(item.sessionId)
      .then((title) => {
        if (!disposed && requested.get(item.sessionId) === item.notificationId) {
          setTitles((value) => new Map(value).set(item.sessionId, title))
        }
      })
      .catch((cause: unknown) => console.error('Codex chat title unavailable', cause))
  }
  createEffect(() => {
    const activities = props.activities()
    const read = untrack(
      () => props.read ?? (codexPort.available ? codexPort.readTitle : undefined),
    )
    if (read === undefined) {
      return
    }
    activities.forEach((item) => request(item, read))
    const ids = new Set(activities.map((item) => item.sessionId))
    for (const id of requested.keys()) {
      if (!ids.has(id)) {
        requested.delete(id)
      }
    }
    setTitles((value) =>
      value.size > ids.size || [...value.keys()].some((id) => !ids.has(id))
        ? new Map([...value].filter(([id]) => ids.has(id)))
        : value,
    )
  })
  onCleanup(() => {
    disposed = true
  })
  return titles
}
