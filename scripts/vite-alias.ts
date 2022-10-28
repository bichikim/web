import {resolveUrl, trimPath} from '@winter-love/utils'
export interface ViteAliasCustomResolverOptions {
  root: string
  workspacePaths: (string | RegExp)[]
}

export interface ViteAliasOptions extends ViteAliasCustomResolverOptions {
  alias: string
}

export const getPathFromWorkspace = (roots: RegExp[], path: string): string => {
  const root = roots.find((root) => {
    return root.test(path)
  })
  if (root) {
    return path.replace(root, '')
  }
  return ''
}

export const getPathDeeps = (path: string) => {
  return trimPath(resolveUrl(path)).split('/').length - 1
}

export const getParentPath = (count: number) => {
  return Array(count).fill('../').join('')
}

export const removeFile = (path: string) => {
  return path.replace(/[-._a-zA-Z0-9]+\.[a-z]+$/u, '')
}

export const removeDeeps = (path: string, deeps: number) => {
  const pathList = trimPath(removeFile(trimPath(resolveUrl(path)))).split('/')
  pathList.splice(pathList.length - deeps)
  return pathList.join('/')
}

export const viteAliasCustomResolver = (options: ViteAliasCustomResolverOptions) => {
  const {workspacePaths, root} = options
  const rootRegexp = RegExp(`^${root}`, 'u')
  const workspaceRegexps = workspacePaths.map((path) => {
    if (typeof path === 'string') {
      return RegExp(`^${path}`, 'u')
    }
    return path
  })
  return (source: string, importer: undefined | string) => {
    if (!importer) {
      return source
    }

    const leftPath = importer.replace(rootRegexp, '')

    const relativePath = getPathFromWorkspace(workspaceRegexps, leftPath)

    const deeps = getPathDeeps(relativePath)

    const path = removeDeeps(importer, deeps)

    return resolveUrl('/', path, source)
  }
}

export const createAliasRegexp = (alias: string) => {
  const trimmedAlias = alias.replace(/^\.?\//u, '')

  return RegExp(`^${trimmedAlias}/(.*)$`, 'u')
}

export const viteAlias = (options: ViteAliasOptions) => {
  const {alias} = options
  return {
    customResolver: viteAliasCustomResolver(options),
    find: createAliasRegexp(alias),
    replacement: `$1`,
  }
}
