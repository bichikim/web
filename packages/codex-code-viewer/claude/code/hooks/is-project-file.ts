const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/')

/** Matches a local file beneath the current project after resolving relative path segments. */
export const isProjectFile = (path: string, workspace: string): boolean => {
  if (!workspace.startsWith('/')) {
    return false
  }
  try {
    const directory = new URL(`file://${encodePath(workspace).replace(/\/+$/u, '')}/`)
    const target = new URL(encodePath(path), directory)
    return target.hostname === '' && target.pathname.startsWith(directory.pathname)
  } catch {
    return false
  }
}
