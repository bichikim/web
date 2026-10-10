import type {FileSummary} from './types'

/** Tracks candidate membership and changed relationships without discarding cached results. */
export const createDependencyGraph = () => {
  const files = new Map<string, FileSummary>()
  const dependents = new Map<string, Set<string>>()
  const candidates = new Map<string, Set<string>>()
  const revisions = new Map<string, number>()
  const unknown = new Set<string>()
  let uncertainRevision = 0
  const connected = (paths: Iterable<string>): Set<string> => {
    const pending = [...paths]
    const visited = new Set<string>()
    for (let cursor = 0; cursor < pending.length; cursor += 1) {
      const path = pending[cursor]
      if (!visited.has(path)) {
        visited.add(path)
        pending.push(...(files.get(path)?.dependencies ?? []), ...(dependents.get(path) ?? []))
      }
    }
    return visited
  }
  const remove = (path: string, summary: FileSummary): void => {
    summary.dependencies.forEach((dependency) => dependents.get(dependency)?.delete(path))
    summary.names.forEach((name) => {
      const entries = candidates.get(name)
      entries?.delete(path)
      if (entries?.size === 0) {
        candidates.delete(name)
      }
    })
    files.delete(path)
    unknown.delete(path)
  }
  return {
    changed: (paths: ReadonlySet<string>, revision: number): ReadonlySet<string> =>
      new Set([...paths].filter((path) => (revisions.get(path) ?? 0) > revision)),
    clear: () => {
      files.clear()
      dependents.clear()
      candidates.clear()
      revisions.clear()
      unknown.clear()
      uncertainRevision = 0
    },
    scope: (paths: readonly string[], name: string): ReadonlySet<string> =>
      unknown.size > 0
        ? new Set(files.keys())
        : connected([...paths, ...(candidates.get(name) ?? [])]),
    uncertain: (revision: number): boolean => uncertainRevision > revision,
    update: (path: string, summary: FileSummary | null, revision: number): void => {
      const previous = files.get(path)
      if (summary !== null && previous?.fingerprint === summary.fingerprint) {
        return
      }
      const propagates =
        previous !== undefined &&
        (summary === null ||
          previous.surface !== summary.surface ||
          JSON.stringify(previous.dependencies) !== JSON.stringify(summary.dependencies) ||
          previous.uncertain !== summary.uncertain)
      const affected = propagates ? connected([path]) : new Set([path])
      if (unknown.size > 0 || summary?.uncertain === true) {
        uncertainRevision = revision
      }
      if (previous !== undefined) {
        remove(path, previous)
      }
      if (summary !== null) {
        files.set(path, summary)
        summary.dependencies.forEach((dependency) => {
          const entries = dependents.get(dependency) ?? new Set<string>()
          entries.add(path)
          dependents.set(dependency, entries)
        })
        summary.names.forEach((name) => {
          const entries = candidates.get(name) ?? new Set<string>()
          entries.add(path)
          candidates.set(name, entries)
        })
        if (summary.uncertain) {
          unknown.add(path)
        }
      }
      const next = propagates ? connected([path]) : new Set([path])
      new Set([...affected, ...next]).forEach((entry) => revisions.set(entry, revision))
    },
  }
}
