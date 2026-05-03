export const stripTrailingSlashExceptRoot = (path: string): string =>
  path.endsWith('/') ? path.slice(0, Math.max(1, path.length - 1)) : path

export const normalizeAgentApiBasePath = (path: string): string => {
  const normalized = stripTrailingSlashExceptRoot(path)

  return normalized.endsWith('/agent') ? normalized : '/agent'
}
