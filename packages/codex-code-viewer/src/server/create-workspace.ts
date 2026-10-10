import {createProjectLanguages} from './create-project-languages'
import {getCodeLocation} from './get-code-location'
import {realpathSync, statSync} from 'node:fs'
import {dirname, relative, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {
  type CodeLocation,
  type CodeSource,
  failure,
  type NavigationKind,
  type Result,
  success,
  type WorkspaceEntry,
} from '../shared/contracts'
import {readCodeSources} from './read-code-sources'
import {writeSource} from './write-source'
import {createEntry} from './create-entry'
import {createFileOperations} from './file-operations'
import {createRustNavigation} from './create-rust-navigation'
import {createPythonNavigation} from './create-python-navigation'
import {createRubyNavigation} from './create-ruby-navigation'
import {fileFormat, type SyntaxLanguage} from '../shared/file-formats'
import {createLanguageService} from './create-language-service'
import {findWorkspace, readSource, resolveFile} from './file-access'
import {createDocumentReader} from './create-document-reader'
import {createFileIndex} from './create-file-index'
import {readMedia} from './read-media'

export const createWorkspace = (anchor: string) => {
  const canonical = realpathSync(anchor)
  const directory = statSync(canonical).isDirectory()
  const root = directory ? canonical : findWorkspace(canonical)
  const languages = createProjectLanguages(root)
  const rust = createRustNavigation(root)
  const python = createPythonNavigation(root)
  const ruby = createRubyNavigation(root)
  const navigation = new Map<SyntaxLanguage, typeof python>([
    ['python', python],
    ['rust', rust],
    ['ruby', ruby],
  ])
  const index = createFileIndex(root)
  const reader = createDocumentReader(root)
  const symbols = (
    path: string,
    offset: number,
    drafts: readonly CodeSource[] = [],
    kind: NavigationKind = 'definition',
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>> => {
    const sources = readCodeSources(root, drafts)
    if (!sources.ok) {
      return sources
    }
    const file = resolveFile(root, path)
    if (!file.ok) {
      return file
    }
    const draft = sources.value.get(file.value)
    const source = draft === undefined ? readSource(root, path) : success(draft)
    if (!source.ok) {
      return source
    }
    if (offset < 0 || offset >= source.value.length) {
      return failure('invalid-position')
    }
    const format = fileFormat(path)
    const analyzer = format?.kind === 'syntax' ? navigation.get(format.language) : undefined
    if (analyzer !== undefined) {
      const file = resolveFile(root, path)
      return file.ok ? analyzer.lookupSymbols(file.value, source.value, offset, kind) : file
    }
    const language =
      drafts.length === 0 ? languages.get(path) : createLanguageService(file.value, sources.value)
    const targets =
      kind === 'definition'
        ? language.definitions(file.value, offset)
        : language.references(
            file.value,
            offset,
            index
              .tree()
              .files.filter((entry) => fileFormat(entry.path)?.kind === 'code')
              .flatMap((entry) => {
                const resolved = resolveFile(root, entry.path)
                return resolved.ok ? [resolved.value] : []
              }),
          )
    if (drafts.length > 0) {
      language.dispose()
    }
    const locations = targets.flatMap((target) => {
      const location = getCodeLocation(root, target.fileName, target.textSpan.start, sources.value)
      return location.ok ? [location.value] : []
    })
    return success(locations)
  }
  const followPath = (
    path: string,
    offset: number,
    drafts: readonly CodeSource[] = [],
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>> => {
    const sources = readCodeSources(root, drafts)
    if (!sources.ok) {
      return sources
    }
    const resolvedSource = resolveFile(root, path)
    if (!resolvedSource.ok) {
      return resolvedSource
    }
    const draft = sources.value.get(resolvedSource.value)
    const source = draft === undefined ? readSource(root, path) : success(draft)
    if (!source.ok) {
      return source
    }
    const format = fileFormat(path)
    if (format?.kind === 'syntax' && navigation.has(format.language)) {
      return symbols(path, offset, drafts)
    }
    const parsed = typescript.createSourceFile(
      path,
      source.value,
      typescript.ScriptTarget.Latest,
      true,
    )
    let specifier: string | null = null
    const visit = (node: typescript.Node): void => {
      if (
        typescript.isStringLiteralLike(node) &&
        node.getStart(parsed) <= offset &&
        offset < node.end
      ) {
        specifier = node.text
      }
      typescript.forEachChild(node, visit)
    }
    visit(parsed)
    if (specifier === null) {
      return failure('invalid-position')
    }
    const file = resolve(root, path)
    const module = languages.get(path).resolveModule(file, specifier)
    const target = module ?? resolve(dirname(file), specifier)
    const resolved = resolveFile(root, target)
    return resolved.ok
      ? success([{column: 1, line: 1, path: relative(root, resolved.value)}])
      : resolved
  }
  return {
    create: (parent: string, name: string, kind: WorkspaceEntry['kind']) =>
      createEntry({kind, name, parent, root}),
    definitions: (path: string, offset: number, drafts: readonly CodeSource[] = []) =>
      symbols(path, offset, drafts),
    dispose: () => {
      index.dispose()
      reader.dispose()
      languages.dispose()
      rust.dispose()
      python.dispose()
      ruby.dispose()
    },
    followPath,
    list: index.list,
    media: (path: string, revision: string, offset: number) =>
      readMedia({offset, path, revision, root}),
    operations: createFileOperations(root),
    read: reader.read,
    references: (path: string, offset: number, drafts: readonly CodeSource[] = []) =>
      symbols(path, offset, drafts, 'references'),
    root,
    subscribe: index.subscribe,
    tree: index.tree,
    write: (path: string, source: string, revision: string | null) =>
      writeSource({path, revision, root, source}),
  }
}
