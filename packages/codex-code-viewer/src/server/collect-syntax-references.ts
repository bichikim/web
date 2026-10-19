import {resolve} from 'node:path'
import {type CodeLocation, type Result, success} from '../shared/contracts'
import {fileFormat, type SyntaxLanguage} from '../shared/file-formats'
import {readSource, resolveFile} from './file-access'
import {offsetPosition} from './lsp/offset-position'
import {readNavigationFiles} from './navigation-cache/read-navigation-files'
import {tokenizeDocument} from './tokenize-document'
import type {SymbolLookup} from './types'

interface CollectReferencesOptions {
  readonly root: string
  readonly path: string
  readonly source: string
  readonly offset: number
  readonly language: SyntaxLanguage
  readonly lookup: SymbolLookup
  readonly query: (
    path: string,
    source: string,
    offset: number,
    lookup: SymbolLookup,
  ) => Promise<Result<CodeLocation[]>>
}
const locationKey = ({path, line, column}: CodeLocation): string =>
  JSON.stringify([resolve(path), line, column])

/** Verifies candidate identifiers against the selected semantic definitions before publishing them. */
export const collectSyntaxReferences = async (
  options: CollectReferencesOptions,
): Promise<Result<CodeLocation[]>> => {
  const signal = options.lookup.signal ?? new AbortController().signal
  const definitions = await options.query(options.path, options.source, options.offset, {
    kind: 'definition',
    signal,
  })
  if (!definitions.ok) {
    return definitions
  }
  const targets = new Set(definitions.value.map(locationKey))
  const listing = await readNavigationFiles(options.root, signal)
  const documents = [...listing.files].flatMap((path) => {
    const format = fileFormat(path)
    const file = resolveFile(options.root, path)
    if (format?.kind !== 'syntax' || format.language !== options.language || !file.ok) {
      return []
    }
    const source =
      file.value === options.path ? success(options.source) : readSource(options.root, path)
    return source.ok ? [{path: file.value, source: source.value}] : []
  })
  const selected = tokenizeDocument(options.path, options.source)
    .flat()
    .find(
      (token) =>
        token.offset <= options.offset && options.offset < token.offset + token.text.length,
    )
  const names = new Set([(selected?.text ?? '').replace(/^r#/u, '')])
  documents.forEach((document) => {
    for (const alias of document.source.matchAll(
      /\bas\s+(?:r#)?(?<name>[\p{XID_Start}_][\p{XID_Continue}]*)/gu,
    )) {
      if (alias.groups?.name !== undefined) {
        names.add(alias.groups.name)
      }
    }
  })
  const locations: CodeLocation[] = []
  for (const document of documents) {
    const found: CodeLocation[] = []
    const candidates = tokenizeDocument(document.path, document.source)
      .flat()
      .filter(
        (token) => token.navigation === 'definition' && names.has(token.text.replace(/^r#/u, '')),
      )
      .map((token) => {
        const position = offsetPosition(document.source, token.offset)
        return {
          location: {column: position.character + 1, line: position.line + 1, path: document.path},
          offset: token.offset,
        }
      })
      .filter((candidate) => !targets.has(locationKey(candidate.location)))
    for (const candidate of candidates) {
      signal.throwIfAborted()
      // oxlint-disable-next-line no-await-in-loop -- Publish only candidates whose definitions were verified.
      const result = await options.query(document.path, document.source, candidate.offset, {
        kind: 'definition',
        signal,
      })
      if (!result.ok) {
        return result
      }
      if (result.value.some((target) => targets.has(locationKey(target)))) {
        found.push(candidate.location)
      }
    }
    options.lookup.receive?.(found)
    locations.push(...found)
  }
  return success(locations)
}
