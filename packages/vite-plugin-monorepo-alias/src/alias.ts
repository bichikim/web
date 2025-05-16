import {type Plugin} from 'vite'
import path from 'node:path'

export interface ResolveIdOptions {
  /**
   * @example
   * {
   *  'DEFAULT': {
   *    'src': 'src',
   *   },
   *  'apps/web': {
   *    '#utils': 'src/utils',
   *   }
   * }
   */
  alias?: Record<string, Record<string, string>>
  root?: string
  separator?: string
  workspacePaths?: (string | RegExp)[]
}

export const trimLastSlash = (path: string, replacer: string): string => {
  return path.replace(/\\?\/*$/u, replacer)
}

export const trimFirstSlash = (path: string, replacer: string): string => {
  return path.replace(/^\\?\/*/u, replacer)
}

export const getWorkspaceRegexString = (workspacePath: string): RegExp => {
  const path = trimLastSlash(trimFirstSlash(workspacePath, '/'), '/[-._a-zA-Z0-9]+/')

  return new RegExp(`${path}`, 'u')
}

export const getWorkspaceRegex = (workspacePath: string | RegExp): RegExp => {
  if (typeof workspacePath === 'string') {
    return getWorkspaceRegexString(workspacePath)
  }

  return getWorkspaceRegexString(workspacePath.source)
}

export const getWorkspaceRegexList = (workspacePaths: (string | RegExp)[]): RegExp[] => {
  return workspacePaths.map(getWorkspaceRegex)
}

export interface MatchWorkspaceResult {
  relativePath: string
  relativeWorkspaceRoot: string
  root: string
  workspaceRoot: string
}

export const matchWorkspace = (
  root: string,
  workspacePaths: RegExp[],
  path: string,
): MatchWorkspaceResult | undefined => {
  for (const workspacePath of workspacePaths) {
    const result = path.match(workspacePath)

    if (result) {
      const [matchedPath] = result
      const [rootPath, relativePath] = path.split(matchedPath)

      if (typeof relativePath === 'string' && rootPath === trimLastSlash(root, '')) {
        return {
          relativePath,
          relativeWorkspaceRoot: matchedPath,
          root,
          workspaceRoot: `${rootPath}${trimLastSlash(matchedPath, '')}`,
        }
      }
    }
  }

  return undefined
}

export const getAliasId = (source: string, alias: [RegExp, string][] = []) => {
  for (const [key, value] of alias) {
    const path = source.replace(key, '')

    if (path !== source) {
      return `${value}${path}`
    }
  }

  return source
}

export const normalizeAliasKey = (path: string) => {
  return new RegExp(`^${path}`, 'u')
}

export const normalizeAlias = (alias: Record<string, string>): [RegExp, string][] => {
  return Object.entries(alias).map(([key, value]) => {
    return [normalizeAliasKey(key), value]
  })
}

export const normalizeAliasTreeKey = (key: string) => {
  return trimLastSlash(trimFirstSlash(key, '/'), '/')
}

export const normalizeAliasTree = (alias: Record<string, Record<string, string>>) => {
  return Object.fromEntries(
    Object.entries(alias).map(([key, value]) => {
      return [normalizeAliasTreeKey(key), normalizeAlias(value)]
    }),
  )
}

const normalizePath = (path: string, separator: string) => {
  return path.replaceAll(separator, '/')
}

const denormalizePath = (path: string, separator: string) => {
  return path.replaceAll('/', separator)
}

export const createAlias = (options: ResolveIdOptions): Plugin => {
  const {
    workspacePaths = [],
    alias = {
      DEFAULT: {
        src: 'src',
      },
    },
    root = process.cwd(),
    separator = path.sep,
  } = options

  const _alias = normalizeAliasTree({
    DEFAULT: {
      src: 'src',
    },
    ...alias,
  })

  const workspaceRegexList = getWorkspaceRegexList(workspacePaths)
  const normalizedRoot = normalizePath(root, separator)

  return {
    name: 'monorepo-alias',
    resolveId(this: any, source, importer, resolveOptions) {
      if (!importer) {
        return source
      }

      const normalizedImporter = normalizePath(importer, separator)

      const importerInfo = matchWorkspace(normalizedRoot, workspaceRegexList, normalizedImporter)

      if (!importerInfo) {
        return source
      }

      const targetAlias = _alias[importerInfo.relativeWorkspaceRoot] ?? _alias['/DEFAULT/']

      const updatedId = denormalizePath(`${importerInfo.workspaceRoot}/${getAliasId(source, targetAlias)}`, separator)

      return this.resolve(updatedId, importer, {skipSelf: true, ...resolveOptions}).then((resolved) => {
        if (resolved) {
          return resolved
        }

        return {
          id: updatedId,
        }
      })
    },
  }
}

export const monorepoAlias = createAlias
