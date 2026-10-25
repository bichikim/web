import {type FSWatcher, watch} from 'node:fs'
import {join} from 'node:path'
import {runGit} from './run-git'

/** Observes index/ref changes in both ordinary repositories and linked worktrees. */
export const observeGit = (root: string) => {
  const listeners = new Set<() => void>()
  const watchers: FSWatcher[] = []
  const lifetime = new AbortController()
  const notify = (): void => listeners.forEach((listener) => listener())
  const started = Promise.all([
    runGit(root, ['rev-parse', '--path-format=absolute', '--git-dir'], lifetime.signal),
    runGit(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'], lifetime.signal),
  ])
    .then((results) => {
      if (lifetime.signal.aborted) {
        return
      }
      for (const directory of new Set(
        results.filter((result) => result.ok).map((result) => result.output.replace(/\n$/u, '')),
      )) {
        try {
          const watcher = watch(
            directory,
            {persistent: false, recursive: true},
            (_event, filename) => {
              const path = filename?.toString().replaceAll('\\', '/') ?? ''
              if (path === '' || /^(?:HEAD|index|packed-refs|config|refs\/)/u.test(path)) {
                notify()
              }
            },
          )
          watcher.on('error', notify)
          watchers.push(watcher)
        } catch {
          // File events and explicit refresh still work on platforms without recursive metadata watching.
          notify()
        }
      }
    })
    .catch((error: unknown) => {
      if (!lifetime.signal.aborted) {
        console.warn('Git metadata observation failed', error)
      }
    })
  return {
    dispose: (): void => {
      lifetime.abort()
      watchers.forEach((watcher) => watcher.close())
      listeners.clear()
    },
    ready: started,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
