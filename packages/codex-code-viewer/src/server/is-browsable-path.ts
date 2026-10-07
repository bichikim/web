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
])

/** Checks whether a workspace-relative path belongs in file discovery. */
export const isBrowsablePath = (path: string): boolean =>
  path.split('/').every((part) => !part.startsWith('.') && !IGNORED.has(part))
