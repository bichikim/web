import {createRootRegexp} from './root-regexp'
import {getWorkspacePath} from './get-workspace-paths'
import {getRelativePath} from './get-relative-path'
import {getPathDeeps} from './get-path-deeps'
import {removeDeeps} from './remove-deeps'
import {resolveUrl} from './resolve-url'
export interface CustomResolverOptions {
  osPathDelimiter?: string
  root?: string
  sourceRoot?: string
  workspacePaths?: (string | RegExp)[]
}
export const createCustomResolver = (options) => {
  const {
    workspacePaths = [],
    root = './',
    osPathDelimiter = process.platform === 'win32' ? '\\' : '/',
    // sourceRoot,
  } = options

  const rootRegexp = createRootRegexp(root, osPathDelimiter)

  const workspaceRegexps = getWorkspacePath(workspacePaths)

  return (source: string, importer: undefined | string) => {
    if (!importer) {
      return source
    }

    const leftPath = importer.replace(rootRegexp, '')

    const relativePath = getRelativePath(workspaceRegexps, leftPath)

    const deeps = getPathDeeps(relativePath)

    const path = removeDeeps(importer, deeps)

    return resolveUrl('/', path, source)
  }
}
