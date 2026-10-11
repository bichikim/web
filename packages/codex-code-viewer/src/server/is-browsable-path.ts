import {HIDDEN_TEXT_FILES} from '../shared/file-formats'

const IGNORED = new Set([
  'node_modules',
  '.git',
  '.codex',
  '.aws',
  '.ssh',
  '.output',
  '.server',
  '.turbo',
  'dist',
  'coverage',
  '__pycache__',
  'site-packages',
])

/** Checks whether a workspace-relative path belongs in file discovery. */
export const isBrowsablePath = (path: string): boolean =>
  path
    .split('/')
    .every(
      (part) => (!part.startsWith('.') || HIDDEN_TEXT_FILES.includes(part)) && !IGNORED.has(part),
    )
