import {createRootRegexp} from '../root-regexp'
import {getWorkspacePath} from '../get-workspace-paths'
import {getRelativePath} from '../get-relative-path'
import {getPathDeeps} from '../get-path-deeps'
import {removeDeeps} from '../remove-deeps'
import {resolveUrl} from '../resolve-url'
import {applySourceRoot} from '../apply-source-root'
import {removeQuery} from '../remove-query'

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
  const workspaceRegexString = getWorkspacePath(workspacePaths)

  return async function resolveId(
    this: any,
    source: string,
    importer: undefined | string,
    resolveOptions?: Record<any, any>,
  ) {
    if (!importer) {
      return source
    }

    const workspaceRegexps = applySourceRoot(workspaceRegexString, sourceRoot, {
      importer,
      source,
    })
    const importerWithoutQuery = removeQuery(importer)
    const leftPath = importerWithoutQuery.replace(rootRegexp, '')
    const relativePath = getRelativePath(workspaceRegexps, leftPath)
    const deeps = getPathDeeps(relativePath)
    const path = removeDeeps(importerWithoutQuery, deeps)
    const lookupPath = resolveUrl('/', path, source)
    // eslint-disable-next-line no-invalid-this
    const newPath = await this.resolve?.(lookupPath, importerWithoutQuery, {
      ...resolveOptions,
      skipSelf: true,
    })

    if (newPath) {
      return newPath
    }

    return {
      id: resolveUrl('/', path, source),
    }
  }
}
