import {resolve} from 'node:path'
import {readChangedPaths} from './read-changed-paths'
import {readNavigationFiles} from './read-navigation-files'
import {readPathRevisions} from './read-path-revisions'
import type {NavigationCheckpoint} from './types'

interface NavigationSnapshot extends NavigationCheckpoint {
  include(inputs: ReadonlyMap<string, string>): NavigationSnapshot
}
const snapshot = (
  checkpoints: ReadonlyMap<string, string>,
  configuration: string,
  discovery: NavigationCheckpoint['discovery'],
): NavigationSnapshot => ({
  bytes: [...checkpoints].reduce(
    (sum, [path, revision]) => sum + (path.length + revision.length) * 2,
    0,
  ),
  configuration,
  discovery,
  include: (inputs) => snapshot(new Map([...inputs, ...checkpoints]), configuration, discovery),
  unchanged: async (signal) => (await readChangedPaths(checkpoints, signal)).length === 0,
})

/** Captures source membership and metadata without parsing source contents. */
export const createNavigationCheckpoint = async (
  root: string,
  signal: AbortSignal,
): Promise<NavigationSnapshot> => {
  const listing = await readNavigationFiles(root, signal)
  const sources = await readPathRevisions(
    [...listing.files].map((path) => resolve(root, path)),
    signal,
  )
  const checkpoints = new Map(
    [...listing.directories, ...listing.configurations, ...sources].map(([path, revision]) => [
      path,
      revision ?? 'unreadable',
    ]),
  )
  return snapshot(
    checkpoints,
    JSON.stringify(
      [...listing.configurations].sort(([left], [right]) => left.localeCompare(right)),
    ),
    listing.discovery,
  )
}
