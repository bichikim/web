import {mayHaveModuleBindings} from './may-have-module-bindings'
import {createTimings} from './create-timings'
import {dirname, relative, resolve, sep} from 'node:path'
import typescript from '@typescript/typescript6'
import {createDeclarationSources} from '../create-declaration-sources'
import {createNavigationFileSystem} from '../create-navigation-file-system'
import {createImportResolver} from './create-import-resolver'
import {createSourceReader} from './create-source-reader'
import {readProjectDocuments} from './read-project-documents'
import {readInputRevisions} from './read-input-revisions'
import {readModuleBindings} from './read-module-bindings'
import {isSupportedSource} from './is-supported-source'
import {readCommonjsOrigin} from './read-commonjs-origin'
import {readDirectReferences} from './read-direct-references'
import {offsetPosition} from '../lsp/offset-position'
import type {NativeLocation, SourcePoint} from './types'

interface WorkspaceInputs {
  readonly sources?: ReadonlyMap<string, string>
  readonly root: string
  readonly files: readonly string[]
  readonly directories: readonly string[]
}
const declarationFile = (path: string): boolean => /\.d\.[cm]?ts$/u.test(path)
const createDirectReader = (
  root: string,
  files: readonly string[],
  reader: ReturnType<typeof createSourceReader>,
  imports: ReturnType<typeof createImportResolver>,
) => {
  const EARLY_FILE_LIMIT = 256
  const retained = new Map<string, readonly NativeLocation[]>()
  return (input: SourcePoint, includeUsages = false): readonly NativeLocation[] => {
    const selected = {...input, file: resolve(root, input.file)}
    const key = JSON.stringify([input.file, input.offset, input.source, includeUsages])
    const cached = retained.get(key)
    if (cached !== undefined) {
      return cached
    }
    const directory = dirname(selected.file)
    const rank = (file: string): number =>
      dirname(file) === directory ? 2 : Number(file.startsWith(`${directory}${sep}`))
    // Bound only the early pass; the native scan still covers every project and binding.
    const candidates = files
      .map((file) => resolve(root, file))
      .toSorted((left, right) => rank(right) - rank(left))
      .slice(0, EARLY_FILE_LIMIT)
    const found = readDirectReferences({
      includeUsages,
      input: selected,
      paths: candidates,
      read: reader.text,
      resolve: imports.resolveDirect,
    }).map((point) => {
      const position = offsetPosition(point.source, point.offset)
      return {
        column: position.character + 1,
        line: position.line + 1,
        path: relative(root, point.file),
      }
    })
    retained.set(key, found)
    return found
  }
}

/** Indexes workspace metadata and resolves early import usages within individual files. */
export const createWorkspaceLinks = ({
  root,
  files,
  directories,
  sources = new Map(),
}: WorkspaceInputs) => {
  const timings = createTimings()
  const inputs = new Set([...files, ...directories].map((file) => resolve(root, file)))
  const filesystem = createNavigationFileSystem({
    ...typescript.sys,
    directoryExists: (file) => {
      inputs.add(file)
      return typescript.sys.directoryExists(file)
    },
    fileExists: (file) => {
      inputs.add(file)
      return typescript.sys.fileExists(file)
    },
    readFile: (file, encoding) => {
      inputs.add(file)
      return sources.get(resolve(file)) ?? typescript.sys.readFile(file, encoding)
    },
  })
  const imports = createImportResolver(filesystem.host)
  const reader = createSourceReader(root, filesystem.host.readFile)
  const {canonical, counterparts, read} = reader
  const declarations = createDeclarationSources(root, (file) => filesystem.host.readFile(file))
  const pairs = new Map<string, Set<string>>()
  const queue: string[] = []
  const visited = new Set<string>()
  const bindings: {local: SourcePoint; property: SourcePoint}[] = []
  const add = (file: string): void => {
    if (!declarationFile(file)) {
      return
    }
    const path = canonical(file)
    if (path !== undefined && declarationFile(path) && !visited.has(path)) {
      visited.add(path)
      const origin = declarations.read(path)
      if (origin !== undefined) {
        const current = pairs.get(origin) ?? new Set<string>()
        current.add(path)
        pairs.set(origin, current)
        queue.push(path)
      }
    }
  }
  let prepared = false
  let documents: readonly string[] | undefined
  const direct = createDirectReader(root, files, reader, imports)
  const projectDocuments = (): readonly string[] => {
    documents ??= timings.measure('projects', () =>
      readProjectDocuments(root, files, filesystem.host),
    )
    return documents
  }
  const prepare = (): readonly string[] => {
    if (prepared) {
      return projectDocuments()
    }
    const summarize = (path: string): void => {
      const text = timings.measure('readText', () => reader.text(path))
      if (text !== undefined) {
        if (mayHaveModuleBindings(text)) {
          const source = timings.measure('parseBinding', () => read(path))
          if (source !== undefined) {
            readModuleBindings(source).forEach((binding) =>
              bindings.push({
                local: {file: path, offset: binding.local, source: text},
                property: {file: path, offset: binding.property, source: text},
              }),
            )
          }
        }
        imports.read(path, text).forEach(add)
        add(path)
      }
    }
    files.forEach((file) => summarize(resolve(root, file)))
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const path = queue[cursor]
      const text = reader.text(path)
      if (text !== undefined) {
        imports.read(path, text).forEach(add)
      }
    }
    prepared = true
    return projectDocuments()
  }
  const point = (location: NativeLocation): SourcePoint | undefined => {
    const file = canonical(location.path)
    const source = file === undefined ? undefined : read(file)
    return source === undefined
      ? undefined
      : {
          file: source.fileName,
          offset: source.getPositionOfLineAndCharacter(location.line - 1, location.column - 1),
          source: source.text,
        }
  }
  return {
    bindings: () => bindings,
    checkpoint: () => readInputRevisions([...inputs], new AbortController().signal),
    companions: (source: SourcePoint): readonly SourcePoint[] =>
      [...(pairs.get(source.file) ?? [])].flatMap((file) => counterparts(source, file)),
    directReferences: direct,
    documents: projectDocuments,
    hasSources: (): boolean => files.some(isSupportedSource),
    location: (point: SourcePoint): NativeLocation => {
      const source = read(point.file)
      if (source === undefined) {
        throw new Error(`Missing source: ${point.file}`)
      }
      const position = source.getLineAndCharacterOfPosition(point.offset)
      return {
        column: position.character + 1,
        line: position.line + 1,
        path: relative(root, point.file),
      }
    },
    origins: (source: SourcePoint): readonly SourcePoint[] | undefined => {
      const origin = declarations.read(source.file)
      if (origin !== undefined) {
        return counterparts(source, origin)
      }
      const syntax = /\.[cm]?jsx?$/u.test(source.file) ? read(source.file) : undefined
      const offset = syntax === undefined ? undefined : readCommonjsOrigin(syntax, source.offset)
      return offset === undefined ? undefined : [{...source, offset}]
    },
    point,
    prepare,
    statistics: () => ({
      ...imports.statistics(),
      bindings: bindings.length,
      declarations: queue.length,
      inputs: inputs.size,
      metadataTimings: timings.read(),
      sources: reader.size(),
    }),
  }
}
