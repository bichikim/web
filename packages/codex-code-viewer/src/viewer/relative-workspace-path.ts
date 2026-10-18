/** Returns a workspace-relative path, or null for paths outside that workspace. */
export const relativeWorkspacePath = (workspace: string, absolute: string): string | null => {
  const root = workspace.replace(/\\/gu, '/').replace(/\/$/u, '')
  const path = absolute.replace(/\\/gu, '/')
  return path === root ? '' : path.startsWith(`${root}/`) ? path.slice(root.length + 1) : null
}
