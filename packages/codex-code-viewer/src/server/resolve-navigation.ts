import {resolve} from 'node:path'
import {
  type CodeDocument,
  type CodeSource,
  type NavigationResult,
  type Result,
  success,
} from '../shared/contracts'
import type {createWorkspace} from './create-workspace'
import {offsetPosition} from './lsp/offset-position'
import {readReferencePreviews} from './read-reference-previews'
import {fileFormat} from '../shared/file-formats'
import {tokenizeDocument} from './tokenize-document'

interface ResolveNavigationOptions {
  readonly workspace: Pick<
    ReturnType<typeof createWorkspace>,
    'root' | 'definitions' | 'references' | 'followPath'
  >
  readonly document: CodeDocument
  readonly path: string
  readonly offset: number
  readonly navigation: 'definition' | 'path'
  readonly sources?: readonly CodeSource[]
}
/** Follows usages to definitions and exposes references when the selected symbol defines itself. */
export const resolveNavigation = async (
  options: ResolveNavigationOptions,
): Promise<Result<NavigationResult>> => {
  const locations =
    options.navigation === 'path'
      ? await options.workspace.followPath(options.path, options.offset, options.sources)
      : await options.workspace.definitions(options.path, options.offset, options.sources)
  if (!locations.ok) {
    return locations
  }
  const draft = options.sources?.find(
    (entry) =>
      resolve(options.workspace.root, entry.path) === resolve(options.workspace.root, options.path),
  )
  const source = draft?.source ?? options.document.source
  const position = offsetPosition(source, options.offset)
  const lines =
    draft === undefined ? options.document.lines : tokenizeDocument(options.path, source)
  const token = lines[position.line]?.find(
    (entry) => entry.offset <= options.offset && options.offset < entry.offset + entry.text.length,
  )
  const format = fileFormat(options.path)
  const ruby = format?.kind === 'syntax' && format.language === 'ruby'
  const nameColumn = offsetPosition(source, token?.offset ?? options.offset).character + 1
  const line = source.split(/\r\n|\n|\r/u)[position.line] ?? ''
  const own =
    options.navigation === 'definition' &&
    locations.value.some(
      (location) =>
        location.path === options.document.location.path &&
        location.line === position.line + 1 &&
        (location.column === nameColumn ||
          (ruby &&
            location.column < nameColumn &&
            /^(?:def|class|module)\s+(?:[\p{ID_Continue}]+(?:::|\.))*$/u.test(
              line.slice(location.column - 1, nameColumn - 1),
            ))),
    )
  if (!own) {
    return success({kind: 'definition', locations: locations.value})
  }
  const references = await options.workspace.references(
    options.path,
    options.offset,
    options.sources,
  )
  if (!references.ok) {
    return references
  }
  const unique = new Map(references.value.map((location) => [JSON.stringify(location), location]))
  return success({
    kind: 'references',
    locations: readReferencePreviews({
      locations: [...unique.values()].sort(
        (left, right) =>
          left.path.localeCompare(right.path) ||
          left.line - right.line ||
          left.column - right.column,
      ),
      root: options.workspace.root,
      sources: options.sources,
    }),
  })
}
