import {relative, resolve, sep} from 'node:path'
import type {FileBaseline} from '../../shared/change-contracts'
import {MAX_CODE_BYTES} from '../../shared/editing-limits'
import {isBrowsablePath} from '../is-browsable-path'
import {isWithin} from '../file-access'
import {readComparison} from './read-comparison'
import {runGit} from './run-git'
const OUTPUT_MARGIN = 1024

/** Reads a bounded UTF-8 baseline blob, without following deleted paths or running textconv filters. */
export const readBaseline = async (
  root: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileBaseline> => {
  const absolute = resolve(root, path)
  const normalized = relative(root, absolute).split(sep).join('/')
  if (!isWithin(root, absolute) || normalized === '' || !isBrowsablePath(normalized)) {
    throw new Error('Path outside browsable workspace')
  }
  const comparison = await readComparison(root, signal)
  if (comparison === null) {
    return {available: false, base: null, source: null}
  }
  const result = {available: true, base: comparison.base, source: ''}
  if (comparison.revision === null) {
    return result
  }
  const tree = await runGit(
    root,
    ['ls-tree', '-z', '--full-tree', comparison.revision, '--', comparison.prefix + normalized],
    signal,
  )
  if (!tree.ok) {
    throw new Error('Git baseline tree could not be read')
  }
  if (tree.output === '') {
    return result
  }
  const metadata = tree.output.slice(0, tree.output.indexOf('\t')).split(' ')
  const [, , object] = metadata
  if (
    !/^100[0-7]{3}$/u.test(metadata[0]) ||
    metadata[1] !== 'blob' ||
    !/^[a-f0-9]{40,64}$/u.test(object)
  ) {
    return {...result, source: null}
  }
  const size = await runGit(root, ['cat-file', '-s', object], signal)
  if (!size.ok || Number(size.output) > MAX_CODE_BYTES) {
    return {...result, source: null}
  }
  const content = await runGit(
    root,
    ['cat-file', 'blob', object],
    signal,
    MAX_CODE_BYTES + OUTPUT_MARGIN,
  )
  if (!content.ok) {
    throw new Error('Git baseline blob could not be read')
  }
  return {
    ...result,
    source: !content.validUtf8 || content.output.includes('\0') ? null : content.output,
  }
}
