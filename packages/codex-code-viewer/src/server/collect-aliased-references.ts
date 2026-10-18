import {type CodeLocation, type Result, success} from '../shared/contracts'
import {offsetPosition} from './lsp/offset-position'
import {readSource, resolveFile} from './file-access'
import type {SymbolLookup} from './types'

interface CollectAliasedReferencesOptions {
  readonly root: string
  readonly path: string
  readonly source: string
  readonly readAliases: (source: string) => ReadonlyMap<string, number>
  readonly lookup: SymbolLookup
  readonly isAliasReference?: (source: string, binding: number, target: number) => boolean
  readonly locations: readonly CodeLocation[]
  readonly query: (
    path: string,
    source: string,
    offset: number,
    lookup: SymbolLookup,
  ) => Promise<Result<CodeLocation[]>>
}

interface AliasReference {
  readonly binding: CodeLocation
  readonly source: string
  readonly offset: number
}
const locationKey = ({path, line, column}: CodeLocation): string =>
  JSON.stringify([path, line, column])
const createAliasReader = (
  options: Pick<CollectAliasedReferencesOptions, 'root' | 'path' | 'source' | 'readAliases'>,
) => {
  const documents = new Map<string, {source: string; aliases: ReadonlyMap<string, number>}>()
  return (target: CodeLocation): Result<AliasReference | undefined> => {
    const file = resolveFile(options.root, target.path)
    if (!file.ok) {
      return success(undefined)
    }
    let document = documents.get(file.value)
    if (document === undefined) {
      const source =
        file.value === options.path ? success(options.source) : readSource(options.root, file.value)
      if (!source.ok) {
        return source
      }
      document = {aliases: options.readAliases(source.value), source: source.value}
      documents.set(file.value, document)
    }
    const offset = document.aliases.get(`${target.line}:${target.column}`)
    if (offset === undefined) {
      return success(undefined)
    }
    const position = offsetPosition(document.source, offset)
    return success({
      binding: {column: position.character + 1, line: position.line + 1, path: file.value},
      offset,
      source: document.source,
    })
  }
}

/** Completes semantic references through aliases and transitive reexports. */
export const collectAliasedReferences = async (
  options: CollectAliasedReferencesOptions,
): Promise<Result<CodeLocation[]>> => {
  const locations = new Map(options.locations.map((target) => [locationKey(target), target]))
  const readAlias = createAliasReader(options)
  for (const target of locations.values()) {
    options.lookup.signal?.throwIfAborted()
    const alias = readAlias(target)
    if (!alias.ok) {
      return alias
    }
    // Reuse bindings covered by completed semantic queries.
    if (alias.value !== undefined && !locations.has(locationKey(alias.value.binding))) {
      const {binding, source, offset} = alias.value
      // Its own reference query excludes the alias declaration, which refers to the original symbol.
      locations.set(locationKey(binding), binding)
      options.lookup.receive?.([binding])
      const validate = options.isAliasReference
      const offsets = [
        0,
        ...Array.from(source.matchAll(/\r\n|\r|\n/gu), (match) => match.index + match[0].length),
      ]
      const verify = (found: readonly CodeLocation[]): CodeLocation[] =>
        found.filter((location) => {
          if (validate === undefined) {
            return true
          }
          const file = resolveFile(options.root, location.path)
          if (!file.ok || file.value !== binding.path) {
            return true
          }
          const position = (offsets[location.line - 1] ?? source.length) + location.column - 1
          return validate(source, offset, position)
        })
      // oxlint-disable-next-line no-await-in-loop -- New semantic results can expose another reexported alias.
      const result = await options.query(binding.path, source, offset, {
        ...options.lookup,
        ...(options.lookup.receive === undefined
          ? {}
          : {receive: (found: readonly CodeLocation[]) => options.lookup.receive?.(verify(found))}),
        draft: binding.path === options.path && options.lookup.draft === true,
      })
      if (!result.ok) {
        return result
      }
      const verified = verify(result.value)
      verified.forEach((location) => locations.set(locationKey(location), location))
      options.lookup.receive?.(verified)
    }
  }
  return success([...locations.values()])
}
