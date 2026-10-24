import {type CodeLocation, type Result, success} from '../shared/contracts'
import {readSource, resolveFile} from './file-access'
import {offsetPosition} from './lsp/offset-position'
import {tokenizeDocument} from './tokenize-document'
import type {SymbolLookup} from './types'

interface PythonReferenceOptions {
  readonly root: string
  readonly path: string
  readonly source: string
  readonly offset: number
  readonly lookup: SymbolLookup
  readonly query: (
    path: string,
    source: string,
    offset: number,
    lookup: SymbolLookup,
  ) => Promise<Result<CodeLocation[]>>
  readonly queryRelated: PythonReferenceOptions['query']
}
interface PythonStub {
  readonly path: string
  readonly source: string
  readonly offset: number
}
interface PythonTargets {
  readonly definitions: readonly CodeLocation[]
  readonly stubs: readonly PythonStub[]
}
const locationKey = (location: CodeLocation): string =>
  JSON.stringify([location.path, location.line, location.column])
const stubCandidates = (
  options: PythonReferenceOptions,
  definition: CodeLocation,
): PythonStub[] => {
  if (!definition.path.endsWith('.py')) {
    return []
  }
  const implementation =
    definition.path === options.path
      ? success(options.source)
      : readSource(options.root, definition.path)
  const file = resolveFile(options.root, `${definition.path}i`)
  if (!implementation.ok || !file.ok) {
    return []
  }
  const stub = readSource(options.root, file.value)
  if (!stub.ok) {
    return []
  }
  const symbol = tokenizeDocument(definition.path, implementation.value)
    .flat()
    .find((token) => {
      const position = offsetPosition(implementation.value, token.offset)
      return position.line + 1 === definition.line && position.character + 1 === definition.column
    })
  return tokenizeDocument(file.value, stub.value)
    .flat()
    .filter((token) => token.text === symbol?.text && token.navigation === 'definition')
    .map((token) => ({offset: token.offset, path: file.value, source: stub.value}))
}

/** Finds stub declarations whose analyzer definitions point to the selected Python implementation. */
export const readPythonReferenceTargets = async (
  options: PythonReferenceOptions,
): Promise<Result<PythonTargets>> => {
  const request = {
    draft: options.lookup.draft,
    kind: 'definition' as const,
    signal: options.lookup.signal,
  }
  const definitions = await options.query(options.path, options.source, options.offset, request)
  if (!definitions.ok) {
    return definitions
  }
  const known = new Map(definitions.value.map((location) => [locationKey(location), location]))
  const stubs = new Map<string, PythonStub>()
  for (const candidate of definitions.value.flatMap((definition) =>
    stubCandidates(options, definition),
  )) {
    options.lookup.signal?.throwIfAborted()
    // oxlint-disable-next-line no-await-in-loop -- Pyright must confirm each candidate's implementation before merging it.
    const resolved = await options.queryRelated(
      candidate.path,
      candidate.source,
      candidate.offset,
      {
        kind: 'definition',
        signal: options.lookup.signal,
      },
    )
    if (!resolved.ok) {
      return resolved
    }
    if (resolved.value.some((target) => known.has(locationKey(target)))) {
      resolved.value.forEach((target) => known.set(locationKey(target), target))
      const position = offsetPosition(candidate.source, candidate.offset)
      const location = {
        column: position.character + 1,
        line: position.line + 1,
        path: candidate.path,
      }
      known.set(locationKey(location), location)
      stubs.set(locationKey(location), candidate)
    }
  }
  return success({definitions: [...known.values()], stubs: [...stubs.values()]})
}
