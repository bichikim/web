import {createSignal, untrack} from 'solid-js'
import type {SurfaceEntry, WorkspaceOwner} from './types'
/** Restores the previous outlet when a temporary loading surface releases its registration. */
export const createSurfaceRegistry = <T extends {readonly owner: string}>() => {
  const [entries, setEntries] = createSignal<
    Readonly<Record<string, ReadonlyArray<SurfaceEntry<T>>>>
  >({editor: [], runtime: []})
  const bind = (entry: SurfaceEntry<T>) => {
    const owner = untrack(() => entry.props.owner)
    setEntries((all) => ({...all, [owner]: [...(all[owner] ?? []), entry]}))
    return () =>
      setEntries((all) => ({
        ...all,
        [owner]: (all[owner] ?? []).filter((candidate) => candidate !== entry),
      }))
  }
  return {bind, current: (owner: WorkspaceOwner) => entries()[owner]?.at(-1)}
}
