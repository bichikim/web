import {readPathRevisions} from './read-path-revisions'

/** Compares metadata checkpoints without reading file contents or depending on watcher delivery order. */
export const readChangedPaths = async (
  entries: ReadonlyMap<string, string>,
  signal: AbortSignal,
): Promise<string[]> => {
  const current = await readPathRevisions([...entries.keys()], signal)
  return [...entries]
    .filter(([path, revision]) => current.get(path) !== revision)
    .map(([path]) => path)
}
