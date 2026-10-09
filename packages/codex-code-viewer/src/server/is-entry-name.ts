import type {WorkspaceEntry} from '../shared/contracts'
import {isBrowsablePath} from './is-browsable-path'

const MAX_NAME_LENGTH = 255

/** Accepts a single browsable file or directory name. */
export const isEntryName = (name: string, kind: WorkspaceEntry['kind']): boolean =>
  name.trim() !== '' &&
  name.length <= MAX_NAME_LENGTH &&
  name !== '.' &&
  name !== '..' &&
  !/[/\\\0:]/u.test(name) &&
  !(kind === 'directory' && name.startsWith('.')) &&
  isBrowsablePath(name)
