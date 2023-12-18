export const getWorkspacePath = (workspacePaths?: (string | RegExp)[]) => {
  if (!workspacePaths) {
    return []
  }
  return workspacePaths.map((path): string => {
    if (typeof path === 'string') {
      return `^${path.replace(/\/$/u, '')}/[-._a-zA-Z0-9]*/`
    }
    return `${path.source.replace(/\\\/$/u, '')}/[-._a-zA-Z0-9]*/`
  })
}
