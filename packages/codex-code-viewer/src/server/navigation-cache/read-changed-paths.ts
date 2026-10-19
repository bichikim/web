import {readPathRevisions} from './read-path-revisions'

/** Compares metadata checkpoints without reading file contents or depending on watcher delivery order. */
export const readChangedPaths = async (
  entries: ReadonlyMap<string, string>,
  signal: AbortSignal,
  read: typeof readPathRevisions = readPathRevisions,
): Promise<string[]> => {
  const current = await read([...entries.keys()], signal)
  return [...entries]
    .filter(([path, revision]) => (current.get(path) ?? 'unreadable') !== revision)
    .map(([path]) => path)
}
