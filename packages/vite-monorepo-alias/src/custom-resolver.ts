import {createRootRegexp} from './root-regexp'
import {getWorkspacePath} from './get-workspace-paths'
import {getRelativePath} from './get-relative-path'
import {getPathDeeps} from './get-path-deeps'
import {removeDeeps} from './remove-deeps'
import {resolveUrl} from './resolve-url'
import {applySourceRoot} from './apply-source-root'
export interface CustomResolverOptions {
  osPathDelimiter?: string
  root?: string
  sourceRoot?: string
  workspacePaths?: (string | RegExp)[]
}
export const createCustomResolver = (options: CustomResolverOptions) => {
  const {
    workspacePaths = [],
    root = './',
    osPathDelimiter = process.platform === 'win32' ? '\\' : '/',
    sourceRoot = 'src',
  } = options

  const rootRegexp = createRootRegexp(root, osPathDelimiter)

  console.log('rootRegexp', rootRegexp)

  const workspaceRegexString = getWorkspacePath(workspacePaths)

  console.log('workspaceRegexps', workspaceRegexString)

  return (source: string, importer: undefined | string) => {
    if (!importer) {
      return source
    }

    const workspaceRegexps = applySourceRoot(workspaceRegexString, sourceRoot, {
      importer,
      source,
    })

    const leftPath = importer.replace(rootRegexp, '')

    console.log('leftPath', leftPath)

    const relativePath = getRelativePath(workspaceRegexps, leftPath)

    console.log('relativePath', relativePath)

    const deeps = getPathDeeps(relativePath)

    console.log('deeps', deeps)

    const path = removeDeeps(importer, deeps)

    console.log('path', path)

    return resolveUrl('/', path, source)
  }
}
