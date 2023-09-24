export const getWorkspacePath = (workspacePaths?: (string | RegExp)[]) => {
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
