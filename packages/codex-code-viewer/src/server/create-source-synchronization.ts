import {resolve} from 'node:path'
import {fileFormat, type SyntaxLanguage} from '../shared/file-formats'
import {readNavigationFiles} from './navigation-cache/read-navigation-files'
import {readChangedPaths} from './navigation-cache/read-changed-paths'
import {readPathRevisions} from './navigation-cache/read-path-revisions'
import type {SourceChange} from './types'
import {withAbort} from './with-abort'

interface SourceSynchronizationOptions {
  readonly root: string
  readonly onConfigurationChange: () => void
  readonly onSourcesChange: (changes: readonly SourceChange[]) => void
}
const sourceChanges = (
  before: ReadonlyMap<string, string | null>,
  after: ReadonlyMap<string, string | null>,
): SourceChange[] =>
  [...new Set([...before.keys(), ...after.keys()])].flatMap((path) => {
    const previous = before.get(path) ?? null
    const next = after.get(path) ?? null
    if (previous === next) {
      return []
    }
    return [{kind: next === null ? 'deleted' : previous === null ? 'created' : 'changed', path}]
  })
/** Tracks language source metadata and delivers changes without building semantic cache summaries. */
export const createSourceSynchronization = (options: SourceSynchronizationOptions) => {
  const snapshots = new Map<SyntaxLanguage, ReadonlyMap<string, string | null>>()
  let listing: Awaited<ReturnType<typeof readNavigationFiles>> | undefined
  let configuration: string | undefined
  let pending = Promise.resolve()
  const refresh = async (language: SyntaxLanguage, signal: AbortSignal): Promise<void> => {
    signal.throwIfAborted()
    const checkpoints =
      listing === undefined
        ? new Map<string, string>()
        : new Map([
            ...listing.directories,
            ...[...listing.configurations].map(
              ([path, revision]) => [path, revision ?? 'missing'] as const,
            ),
          ])
    if (listing === undefined || (await readChangedPaths(checkpoints, signal)).length > 0) {
      listing = await readNavigationFiles(options.root, signal)
    }
    const paths = [...listing.files]
      .filter((path) => {
        const format = fileFormat(path)
        return format?.kind === 'syntax' && format.language === language
      })
      .map((path) => resolve(options.root, path))
    const current = await readPathRevisions(paths, signal)
    signal.throwIfAborted()
    const signature = JSON.stringify(
      [...listing.configurations].sort(([left], [right]) => left.localeCompare(right)),
    )
    if (configuration !== undefined && signature !== configuration) {
      options.onConfigurationChange()
      snapshots.clear()
    }
    configuration = signature
    const previous = snapshots.get(language)
    if (previous !== undefined) {
      const changes = sourceChanges(previous, current)
      if (changes.length > 0) {
        options.onSourcesChange(changes)
      }
    }
    snapshots.set(language, current)
  }
  return {
    dispose: () => {
      snapshots.clear()
      listing = undefined
    },
    refresh: (language: SyntaxLanguage, signal: AbortSignal): Promise<void> => {
      const result = pending.then(() => refresh(language, signal))
      pending = result.then(
        () => undefined,
        () => undefined,
      )
      return withAbort(result, signal)
    },
  }
}
