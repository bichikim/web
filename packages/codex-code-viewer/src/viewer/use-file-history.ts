import {batch, createSignal} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import type {FileMutation} from './types'

/** Tracks successful file visits and discards forward history after a new visit. */
export const useFileHistory = () => {
  const [locations, setLocations] = createSignal<CodeLocation[]>([])
  const [index, setIndex] = createSignal(0)
  const record = (location: CodeLocation, existing?: number): void => {
    if (existing !== undefined) {
      setIndex(existing)
      return
    }
    const next = [...locations().slice(0, index() + 1), location]
    batch(() => {
      setLocations(next)
      setIndex(next.length - 1)
    })
  }
  return {
    applyMutation: (change: FileMutation): void => {
      if (change.action === 'copy') {
        return
      }
      const previous = locations()
      const included = (path: string): boolean =>
        path === change.source || path.startsWith(`${change.source}/`)
      const before = previous
        .slice(0, index())
        .filter((location) => change.action === 'delete' && included(location.path)).length
      const next = previous.flatMap((location) =>
        included(location.path)
          ? change.action === 'delete'
            ? []
            : [{...location, path: change.entry.path + location.path.slice(change.source.length)}]
          : [location],
      )
      batch(() => {
        setLocations(next)
        setIndex(Math.max(0, Math.min(index() - before, next.length - 1)))
      })
    },
    canBack: () => index() > 0,
    canForward: () => index() < locations().length - 1,
    destination: (direction: -1 | 1) => locations()[index() + direction],
    index,
    record,
    reset: (location?: CodeLocation) =>
      batch(() => {
        setLocations(location === undefined ? [] : [location])
        setIndex(0)
      }),
  }
}
