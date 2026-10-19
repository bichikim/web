import {resolve} from 'node:path'
import {
  type CodeDocument,
  type CodeLocation,
  type CodeSource,
  type NavigationResult,
  type Result,
  success,
} from '../shared/contracts'
import {offsetPosition} from './lsp/offset-position'
import {readReferencePreviews} from './read-reference-previews'
import {fileFormat} from '../shared/file-formats'
import {tokenizeDocument} from './tokenize-document'
import {readExportedFunction} from './read-exported-function'
import {isRubyDeclaration} from './is-ruby-declaration'
import type {DefinitionLookup, SymbolProgress} from './types'

export interface NavigationWorkspace {
  readonly directFunctionReferences?: boolean
  readonly root: string
  definitions(
    path: string,
    offset: number,
    sources?: readonly CodeSource[],
    progress?: DefinitionLookup,
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>>
  references(
    path: string,
    offset: number,
    sources?: readonly CodeSource[],
    progress?: SymbolProgress,
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>>
  followPath(
    path: string,
    offset: number,
    sources?: readonly CodeSource[],
    signal?: AbortSignal,
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>>
}
export interface ResolveNavigationOptions {
  readonly workspace: NavigationWorkspace
  readonly document: CodeDocument
  readonly path: string
  readonly offset: number
  readonly navigation: 'definition' | 'path'
  readonly sources?: readonly CodeSource[]
  readonly previews?: boolean
  readonly receive?: SymbolProgress['receive']
  readonly receiveDefinitions?: SymbolProgress['receive']
  readonly signal?: AbortSignal
}
const findDefinitions = async (options: ResolveNavigationOptions, progress?: DefinitionLookup) => {
  if (options.navigation === 'path') {
    return options.workspace.followPath(
      options.path,
      options.offset,
      options.sources,
      ...(options.signal === undefined ? [] : [options.signal]),
    )
  }
  return options.workspace.definitions(
    options.path,
    options.offset,
    options.sources,
    ...(progress === undefined ? [] : [progress]),
  )
}

const resolveReferences = async (
  options: ResolveNavigationOptions,
): Promise<Result<NavigationResult>> => {
  const references = await options.workspace.references(
    options.path,
    options.offset,
    options.sources,
    ...(options.receive === undefined && options.signal === undefined
      ? []
      : [{receive: options.receive, signal: options.signal}]),
  )
  if (!references.ok) {
    return references
  }
  const unique = new Map(references.value.map((location) => [JSON.stringify(location), location]))
  const sorted = [...unique.values()].sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column,
  )
  return success({
    kind: 'references',
    locations:
      options.previews === false
        ? sorted
        : readReferencePreviews({
            locations: sorted,
            root: options.workspace.root,
            sources: options.sources,
          }),
  })
}

const canQueryReferences = (
  options: ResolveNavigationOptions,
  source: string,
  tokenOffset: number,
): boolean =>
  options.workspace.directFunctionReferences === true &&
  options.navigation === 'definition' &&
  fileFormat(options.path)?.kind === 'code' &&
  /\bexport\s+const\s*$/u.test(source.slice(0, tokenOffset)) &&
  readExportedFunction({arrowOnly: true, file: options.path, offset: options.offset, source}) !==
    undefined

const navigationLines = (options: ResolveNavigationOptions, source: string, drafted: boolean) =>
  !drafted && options.document.lines.length > 0
    ? options.document.lines
    : tokenizeDocument(options.path, source)

/** Follows usages to definitions and exposes references when the selected symbol defines itself. */
export const resolveNavigation = async (
  options: ResolveNavigationOptions,
): Promise<Result<NavigationResult>> => {
  const draft = options.sources?.find(
    (entry) =>
      resolve(options.workspace.root, entry.path) === resolve(options.workspace.root, options.path),
  )
  const source = draft?.source ?? options.document.source
  const position = offsetPosition(source, options.offset)
  const lines = navigationLines(options, source, draft !== undefined)
  const token = lines[position.line]?.find(
    (entry) => entry.offset <= options.offset && options.offset < entry.offset + entry.text.length,
  )
  const format = fileFormat(options.path)
  const ruby = format?.kind === 'syntax' && format.language === 'ruby'
  const nameColumn = offsetPosition(source, token?.offset ?? options.offset).character + 1
  const line = source.split(/\r\n|\n|\r/u)[position.line] ?? ''
  const isOwn = (location: CodeLocation): boolean =>
    options.navigation === 'definition' &&
    location.path === options.document.location.path &&
    location.line === position.line + 1 &&
    (location.column === nameColumn ||
      (ruby && location.column < nameColumn && isRubyDeclaration(line, nameColumn)))
  const definitionProgress: DefinitionLookup | undefined =
    options.receiveDefinitions === undefined && options.receive === undefined
      ? undefined
      : {
          receive: (found) =>
            options.receiveDefinitions?.(found.filter((location) => !isOwn(location))),
          receiveOwnReferences: options.receive,
          signal: options.signal,
        }
  if (canQueryReferences(options, source, token?.offset ?? options.offset)) {
    return resolveReferences(options)
  }
  const locations = await findDefinitions(options, definitionProgress)
  if (!locations.ok) {
    return locations
  }
  const own = locations.value.some(isOwn)
  if (!own) {
    return success({
      kind: 'definition',
      locations:
        options.previews !== false && locations.value.length > 1
          ? readReferencePreviews({
              locations: locations.value,
              root: options.workspace.root,
              sources: options.sources,
            })
          : locations.value,
    })
  }
  return resolveReferences(options)
}
