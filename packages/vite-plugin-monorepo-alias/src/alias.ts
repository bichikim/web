import {type Plugin, type Rollup} from 'vite'
import path from 'node:path'

/**
 * Options for the monorepo alias plugin.
 */
export interface ResolveIdOptions {
  /**
   * Workspace-keyed alias map. Keys are workspace paths (e.g. `'packages/foo'`), values are
   * alias records (import specifier → resolution path). Use `'DEFAULT'` for fallback.
   * @example
   * {
   *   'DEFAULT': { 'src': 'src' },
   *   'apps/web': { '#utils': 'src/utils' }
   * }
   */
  alias?: Record<string, Record<string, string>>
  /** Project root path. Defaults to `process.cwd()`. */
  root?: string
  /** Path separator for normalization. Defaults to `path.sep`. */
  separator?: string
  /** Paths or regexes that identify workspace roots (e.g. `['packages/']`). */
  workspacePaths?: (string | RegExp)[]
}

/**
 * Trims trailing backslashes or slashes and appends the replacer.
 * @param path - Path string to trim.
 * @param replacer - String to append after the trimmed path.
 * @returns Trimmed path ending with `replacer`.
 */
export const trimLastSlash = (path: string, replacer: string): string => {
  return path.replace(/\\?\/*$/u, replacer)
}

/**
 * Trims leading backslashes or slashes and prepends the replacer.
 * @param path - Path string to trim.
 * @param replacer - String to prepend before the trimmed path.
 * @returns Trimmed path starting with `replacer`.
 */
export const trimFirstSlash = (path: string, replacer: string): string => {
  return path.replace(/^\\?\/*/u, replacer)
}

/**
 * Builds a RegExp that matches a workspace path plus a package segment (e.g. `packages/foo/`).
 * @param workspacePath - Workspace path string (e.g. `'packages/'`).
 * @returns RegExp matching that path and a segment like `[-._a-zA-Z0-9]+`.
 */
export const getWorkspaceRegexString = (workspacePath: string): RegExp => {
  const path = trimLastSlash(trimFirstSlash(workspacePath, '/'), '/[-._a-zA-Z0-9]+/')

  return new RegExp(`${path}`, 'u')
}

/**
 * Converts a workspace path (string or RegExp) into the standard workspace regex.
 * @param workspacePath - Workspace path string or RegExp (only `source` is used).
 * @returns RegExp for matching that workspace path.
 */
export const getWorkspaceRegex = (workspacePath: string | RegExp): RegExp => {
  if (typeof workspacePath === 'string') {
    return getWorkspaceRegexString(workspacePath)
  }

  return getWorkspaceRegexString(workspacePath.source)
}

/**
 * Builds a list of workspace regexes from path strings and/or RegExps.
 * @param workspacePaths - Array of workspace paths or RegExps.
 * @returns Array of RegExps for matching those workspace paths.
 */
export const getWorkspaceRegexList = (workspacePaths: (string | RegExp)[]): RegExp[] => {
  return workspacePaths.map(getWorkspaceRegex)
}

/**
 * Result of matching an absolute path against configured workspace paths.
 */
export interface MatchWorkspaceResult {
  /** Path relative to the matched workspace root. */
  relativePath: string
  /** Matched workspace root segment (e.g. `'/packages/foo/'`). */
  relativeWorkspaceRoot: string
  /** Project root path passed to `matchWorkspace`. */
  root: string
  /** Absolute path of the matched workspace root. */
  workspaceRoot: string
}

/**
 * Finds every occurrence of {@link workspacePath} in {@link path}.
 *
 * Unlike {@link String.prototype.matchAll}, restarts the search at `match.index + 1` after each
 * hit so matches are found even when they **share a slash** (e.g. `.../web/apps/coong/` — the
 * `/` between `web` and `apps` ends `/apps/web/` and would start `/apps/coong/`, so plain
 * `matchAll` skips the second segment).
 */
const forEachWorkspaceMatch = (
  workspacePath: RegExp,
  path: string,
  callback: (matchedPath: string, index: number) => boolean | void,
): void => {
  const flags = workspacePath.flags.includes('g') ? workspacePath.flags : `${workspacePath.flags}g`
  const pattern = new RegExp(workspacePath.source, flags)

  let searchStart = 0

  while (searchStart <= path.length) {
    pattern.lastIndex = searchStart
    const match = pattern.exec(path)

    if (!match) {
      break
    }

    const [matchedPath] = match
    const {index} = match

    if (callback(matchedPath, index)) {
      break
    }

    searchStart = index + 1
  }
}

/**
 * Finds the first workspace that contains the given path. Order of `workspacePaths` matters.
 * When a pattern matches multiple times (e.g. `/apps/foo/` inside `.../apps/web/.../apps/coong/`),
 * uses the first match whose path prefix equals `root` (the monorepo root).
 * @param root - Project root path.
 * @param workspacePaths - RegExps from `getWorkspaceRegexList`.
 * @param path - Normalized absolute path to test.
 * @returns Match result if the path is under a configured workspace, otherwise `undefined`.
 */
export const matchWorkspace = (
  root: string,
  workspacePaths: RegExp[],
  path: string,
): MatchWorkspaceResult | undefined => {
  const normalizedRoot = trimLastSlash(root, '')

  for (const workspacePath of workspacePaths) {
    let found: MatchWorkspaceResult | undefined

    forEachWorkspaceMatch(workspacePath, path, (matchedPath, index) => {
      const rootPath = path.slice(0, index)
      const relativePath = path.slice(index + matchedPath.length)

      if (rootPath === normalizedRoot) {
        found = {
          relativePath,
          relativeWorkspaceRoot: matchedPath,
          root,
          workspaceRoot: `${rootPath}${trimLastSlash(matchedPath, '')}`,
        }

        return true
      }

      return false
    })

    if (found) {
      return found
    }
  }

  return undefined
}

/**
 * Resolves a module id using the given alias list. First matching alias wins.
 * @param source - Import specifier (e.g. `'#utils/index'`).
 * @param alias - List of `[RegExp, replacement]` pairs (e.g. from `normalizeAlias`).
 * @returns Resolved path if a prefix matched, otherwise `source` unchanged.
 */
export const getAliasId = (source: string, alias: [RegExp, string][] = []) => {
  return matchAliasId(source, alias) ?? source
}

const matchAliasId = (source: string, alias: [RegExp, string][] = []): string | undefined => {
  for (const [key, value] of alias) {
    const path = source.replace(key, '')

    if (path !== source) {
      return `${value}${path}`
    }
  }
}

/**
 * Escapes special regex characters so the string can be used safely in RegExp.
 */
const escapeRegex = (literal: string): string =>
  literal.replaceAll(new RegExp(String.raw`[.*+?^${'$'}()|[\]\\]`, 'gu'), (m) => `\\${m}`)

/**
 * Turns an alias key into a RegExp that matches the key at the start of a string.
 * Metacharacters in the key are escaped so only the literal key matches.
 * @param path - Alias key (e.g. `'#utils'` or `'src/utils'`).
 * @returns RegExp matching `^${path}`.
 */
export const normalizeAliasKey = (path: string) => {
  return new RegExp(`^${escapeRegex(path)}(?=/|$)`, 'u')
}

/**
 * Converts a flat alias map into a list of [RegExp, replacement] for use with `getAliasId`.
 * @param alias - Map of import prefix → resolution path.
 * @returns List of [RegExp, path] with keys normalized by `normalizeAliasKey`.
 */
export const normalizeAlias = (alias: Record<string, string>): [RegExp, string][] => {
  return Object.entries(alias).map(([key, value]) => {
    return [normalizeAliasKey(key), value]
  })
}

/**
 * Normalizes a workspace key to a slash-bounded form (e.g. `'/packages/foo/'`).
 * @param key - Workspace path key.
 * @returns Key with leading/trailing slashes normalized.
 */
export const normalizeAliasTreeKey = (key: string) => {
  return trimLastSlash(trimFirstSlash(key, '/'), '/')
}

/**
 * Converts a workspace-keyed alias tree into a tree of [RegExp, string][] values.
 * @param alias - Map of workspace path → alias map.
 * @returns Map of normalized workspace key → `normalizeAlias(alias[key])`.
 */
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

/**
 * Creates a Vite plugin that applies workspace-specific aliases in a monorepo.
 * Alias is only applied when the importer path matches one of `workspacePaths`.
 * @param options - Plugin options (root, workspacePaths, alias, separator).
 * @returns Vite plugin instance.
 */
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
    resolveId(this: Rollup.PluginContext, source, importer, resolveOptions) {
      if (!importer || source.startsWith('virtual:')) {
        return null
      }

      if (source.includes('\0')) {
        return null
      }

      const normalizedImporter = normalizePath(importer, separator)

      const importerInfo = matchWorkspace(normalizedRoot, workspaceRegexList, normalizedImporter)

      if (!importerInfo) {
        return null
      }

      const targetAlias = _alias[importerInfo.relativeWorkspaceRoot] ?? _alias['/DEFAULT/']
      const aliasId = matchAliasId(source, targetAlias)

      if (aliasId === undefined) {
        return null
      }

      const updatedId = denormalizePath(`${importerInfo.workspaceRoot}/${aliasId}`, separator)

      return this.resolve(updatedId, importer, {skipSelf: true, ...resolveOptions}).then(
        (resolved) => {
          if (resolved) {
            return resolved
          }

          return {
            id: updatedId,
          }
        },
      )
    },
  }
}

/** Alias for `createAlias`. */
export const monorepoAlias = createAlias
