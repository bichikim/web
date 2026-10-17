import {batch, createSignal} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import type {FileMutation} from './types'

/** Tracks successful file visits and discards forward history after a new visit. */
export const useFileHistory = () => {
  const [locations, setLocations] = createSignal<CodeLocation[]>([])
  const [index, setIndex] = createSignal(0)
  const [missing, setMissing] = createSignal<ReadonlySet<string>>(new Set())
  let generation = 0
  const available = (path: string): boolean => !missing().has(path)
  const candidates = (direction: -1 | 1) => {
    const current = index()
    const targets = locations()
      .map((location, position) => ({index: position, location}))
      .filter(
        (target) =>
          (direction === -1 ? target.index < current : target.index > current) &&
          available(target.location.path),
      )
    return direction === -1 ? targets.toReversed() : targets
  }
  const record = (location: CodeLocation, existing?: number): void => {
    generation += 1
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
      generation += 1
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
      const removedCurrent = change.action === 'delete' && included(previous[index()]?.path ?? '')
      batch(() => {
        setLocations(next)
        setIndex(Math.max(0, Math.min(index() - before - Number(removedCurrent), next.length - 1)))
        setMissing((paths) => new Set([...paths].filter((path) => !included(path))))
      })
    },
    available,
    canBack: () => candidates(-1).length > 0,
    candidates,
    canForward: () => candidates(1).length > 0,
    current: () => {
      const location = locations()[index()]
      return location === undefined || !available(location.path)
        ? undefined
        : {index: index(), location}
    },
    generation: () => generation,
    index,
    markMissing: (path: string) => setMissing((paths) => new Set([...paths, path])),
    markPresent: (path: string) =>
      setMissing((paths) => new Set([...paths].filter((entry) => entry !== path))),
    record,
    reset: (location?: CodeLocation) => {
      generation += 1
      batch(() => {
        setMissing(new Set<string>())
        setLocations(location === undefined ? [] : [location])
        setIndex(0)
      })
    },
    retryMissing: () => setMissing(new Set<string>()),
  }
}
