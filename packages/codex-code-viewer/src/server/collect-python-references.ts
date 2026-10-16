import {basename} from 'node:path'
import {type CodeLocation, type Result, success} from '../shared/contracts'
import {collectAliasedReferences} from './collect-aliased-references'
import {collectSyntaxReferences} from './collect-syntax-references'
import type {createPythonService} from './create-python-service'
import {readSource} from './file-access'
import {readPythonAliases} from './read-python-aliases'
import {createPythonAliasValidator} from './create-python-alias-validator'
import {readPythonProject} from './read-python-project'
import {readPythonReferenceTargets} from './read-python-reference-targets'
import {readNavigationFiles} from './navigation-cache/read-navigation-files'
import type {SymbolLookup} from './types'

interface PythonReferencesOptions {
  readonly root: string
  readonly path: string
  readonly source: string
  readonly offset: number
  readonly lookup: SymbolLookup
  readonly isAliasReference?: ReturnType<typeof createPythonAliasValidator>
  readonly service: (directory: string) => Result<ReturnType<typeof createPythonService>>
}
interface ReferenceDocument {
  readonly path: string
  readonly source: string
  readonly offset: number
}
const locationKey = (location: CodeLocation): string =>
  JSON.stringify([location.path, location.line, location.column])
const referenceDocuments = (
  options: PythonReferencesOptions,
  definitions: readonly CodeLocation[],
): ReferenceDocument[] =>
  definitions.flatMap((location) => {
    const content =
      location.path === options.path
        ? success(options.source)
        : readSource(options.root, location.path)
    if (!content.ok) {
      return []
    }
    const lines = content.value.match(/[^\r\n]*(?:\r\n|\r|\n|$)/gu) ?? []
    const offset =
      lines.slice(0, location.line - 1).reduce((length, line) => length + line.length, 0) +
      location.column -
      1
    return [{offset, path: location.path, source: content.value}]
  })

interface ConfiguredReferences extends PythonReferencesOptions {
  readonly directory: string
  readonly declarations: ReadonlySet<string>
  readonly verified: readonly CodeLocation[]
  readonly queries: readonly ReferenceDocument[]
  readonly project: (file: string) => string
  readonly isolated: boolean
}
const collectConfiguredReferences = async (
  options: ConfiguredReferences,
): Promise<Result<CodeLocation[]>> => {
  const {root, path, source, lookup, directory, declarations} = options
  lookup.signal?.throwIfAborted()
  const context = options.service(directory)
  if (!context.ok) {
    return context
  }
  const service = context.value
  const queryRelated: typeof service.lookupSymbols = (file, text, position, request) =>
    service.lookupSymbols(file, text, position, {...request, retainDrafts: true})
  const references = (found: readonly CodeLocation[]): CodeLocation[] =>
    found.filter((target) => !declarations.has(locationKey(target)))
  const owned = (found: readonly CodeLocation[]): CodeLocation[] =>
    references(found).filter((target) => options.project(target.path) === directory)
  const progress = {
    ...lookup,
    receive: (found: readonly CodeLocation[]) => lookup.receive?.(owned(found)),
  }
  const locations = new Map<string, CodeLocation>()
  for (const query of options.queries) {
    // oxlint-disable-next-line no-await-in-loop -- Preserve the edited implementation while querying related stubs or definitions.
    const found = await queryRelated(query.path, query.source, query.offset, {
      ...progress,
      draft: query.path === path && lookup.draft === true,
    })
    if (!found.ok) {
      return found
    }
    // oxlint-disable-next-line no-await-in-loop -- References outside the context can expose aliases owned by this consumer.
    const result = await collectAliasedReferences({
      isAliasReference: options.isAliasReference,
      locations: references([...found.value, ...options.verified]),
      lookup: progress,
      path,
      query: options.isolated ? service.lookupIndexedSymbols : queryRelated,
      readAliases: readPythonAliases,
      root,
      source,
    })
    if (!result.ok) {
      return result
    }
    owned(result.value).forEach((target) => locations.set(locationKey(target), target))
  }
  return success([...locations.values()])
}

/** Merges configured Python references through canonical definitions, paired stubs and transitive aliases. */
export const collectPythonReferences = async (
  options: PythonReferencesOptions,
): Promise<Result<CodeLocation[]>> => {
  const {root, path, source, offset, lookup} = options
  const isAliasReference = createPythonAliasValidator()
  const owners = new Map<string, string>()
  const projectFor = (file: string): string => {
    const directory = owners.get(file) ?? readPythonProject(root, file)
    owners.set(file, directory)
    return directory
  }
  const selected = projectFor(path)
  const initial = options.service(selected)
  if (!initial.ok) {
    return initial
  }
  const listing = await readNavigationFiles(root, lookup.signal ?? new AbortController().signal)
  const projects = new Set([
    selected,
    root,
    ...[...listing.configurations.keys()]
      .filter((file) => ['pyrightconfig.json', 'pyproject.toml'].includes(basename(file)))
      .map(projectFor),
  ])
  const current = options.service(selected)
  if (!current.ok) {
    return current
  }
  if (projects.size === 1 && ![...listing.files].some((file) => file.endsWith('.pyi'))) {
    const result = await current.value.lookupSymbols(path, source, offset, lookup)
    return result.ok
      ? collectAliasedReferences({
          isAliasReference,
          locations: result.value,
          lookup,
          path,
          query: current.value.lookupIndexedSymbols,
          readAliases: readPythonAliases,
          root,
          source,
        })
      : result
  }
  const targets = await readPythonReferenceTargets({
    lookup,
    offset,
    path,
    query: initial.value.lookupSymbols,
    queryRelated: (file, text, position, request) =>
      initial.value.lookupSymbols(file, text, position, {...request, retainDrafts: true}),
    root,
    source,
  })
  if (!targets.ok) {
    return targets
  }
  const declarations = new Set(targets.value.definitions.map(locationKey))
  const locations = new Map<string, CodeLocation>()
  const verified =
    projects.size > 1
      ? await collectSyntaxReferences({
          language: 'python',
          lookup,
          offset,
          path,
          query: (file, text, position, request) => {
            if (file === path && position === offset) {
              return Promise.resolve(success([...targets.value.definitions]))
            }
            const context = options.service(projectFor(file))
            return context.ok
              ? context.value.lookupSymbols(file, text, position, {
                  ...request,
                  draft: file === path && lookup.draft === true,
                  retainDrafts: true,
                })
              : Promise.resolve(context)
          },
          root,
          source,
        })
      : success([])
  if (!verified.ok) {
    return verified
  }
  const documents = referenceDocuments(options, targets.value.definitions)
  for (const directory of projects) {
    // oxlint-disable-next-line no-await-in-loop -- Publish each configured context before completing the next one.
    const result = await collectConfiguredReferences({
      ...options,
      declarations,
      directory,
      isAliasReference,
      isolated: projects.size === 1,
      project: projectFor,
      queries:
        directory === selected ? [{offset, path, source}, ...targets.value.stubs] : documents,
      verified: verified.value,
    })
    if (!result.ok) {
      return result
    }
    result.value.forEach((target) => locations.set(locationKey(target), target))
  }
  return success([...locations.values()])
}
