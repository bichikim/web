export const getWorkspacePath = (
  workspacePaths?: (string | RegExp)[],
  sourceRoot?: string,
) => {
  if (!workspacePaths) {
    return []
  }
  return workspacePaths.map((path) => {
    if (typeof path === 'string') {
      return RegExp(`^${path}`, 'u')
    }
    return path
  })
}
