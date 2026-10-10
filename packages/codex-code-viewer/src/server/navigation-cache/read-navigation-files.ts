import {resolve} from 'node:path'
import {fileFormat} from '../../shared/file-formats'
import {readDirectory} from '../read-directory'
import {isNavigationConfiguration} from './is-navigation-configuration'
import {readPathRevisions} from './read-path-revisions'

export const isAnalyzableFile = (path: string): boolean => {
  const format = fileFormat(path)
  return (
    format?.kind === 'code' ||
    (format?.kind === 'syntax' && ['python', 'rust', 'ruby'].includes(format.language))
  )
}

/** Discovers source membership and checkpoints for directories and analyzer configuration. */
export const readNavigationFiles = async (root: string, signal: AbortSignal) => {
  const listing = await readDirectory(root, {signal})
  if (listing.truncated) {
    throw new Error('Navigation index requires complete file discovery')
  }
  const configurations = await readPathRevisions(
    listing.files
      .filter((file) => isNavigationConfiguration(file.path))
      .map((file) => resolve(root, file.path)),
    signal,
  )
  return {
    configurations,
    directories: new Map(
      listing.directories.map((directory) => [directory.path, directory.revision]),
    ),
    files: new Set(
      listing.files.filter((file) => isAnalyzableFile(file.path)).map((file) => file.path),
    ),
  }
}
