import {realpathSync, statSync} from 'node:fs'
import {dirname, relative, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {type CodeLocation, failure, type Result, success} from '../shared/contracts'
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
  const languages = new Map<string, ReturnType<typeof createLanguageService>>()
  const languageFor = (path: string): ReturnType<typeof createLanguageService> => {
    const file = resolve(root, path)
    const directory = dirname(file)
    const configuration = typescript.findConfigFile(directory, typescript.sys.fileExists)
    const key = configuration ?? directory
    const existing = languages.get(key)
    if (existing !== undefined) {
      return existing
    }
    const service = createLanguageService(file)
    languages.set(key, service)
    return service
  }
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
  const getLocation = (path: string, offset: number): Result<CodeLocation> => {
    const source = readSource(root, path)
    if (!source.ok) {
      return source
    }
    const parsed = typescript.createSourceFile(path, source.value, typescript.ScriptTarget.Latest)
    const position = parsed.getLineAndCharacterOfPosition(offset)
    return success({
      column: position.character + 1,
      line: position.line + 1,
      path: relative(root, path),
    })
  }
  const definitions = (
    path: string,
    offset: number,
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>> => {
    const source = readSource(root, path)
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
      return file.ok ? analyzer.definitions(file.value, source.value, offset) : file
    }
    const targets = languageFor(path).definitions(resolve(root, path), offset)
    const locations = targets.flatMap((target) => {
      const location = getLocation(target.fileName, target.textSpan.start)
      return location.ok ? [location.value] : []
    })
    return success(locations)
  }
  const followPath = (
    path: string,
    offset: number,
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>> => {
    const source = readSource(root, path)
    if (!source.ok) {
      return source
    }
    const format = fileFormat(path)
    if (format?.kind === 'syntax' && navigation.has(format.language)) {
      return definitions(path, offset)
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
    const module = languageFor(path).resolveModule(file, specifier)
    const target = module ?? resolve(dirname(file), specifier)
    const resolved = resolveFile(root, target)
    return resolved.ok
      ? success([{column: 1, line: 1, path: relative(root, resolved.value)}])
      : resolved
  }
  return {
    definitions,
    dispose: () => {
      index.dispose()
      reader.dispose()
      for (const language of languages.values()) {
        language.dispose()
      }
      languages.clear()
      rust.dispose()
      python.dispose()
      ruby.dispose()
    },
    followPath,
    list: index.list,
    media: (path: string, revision: string, offset: number) =>
      readMedia({offset, path, revision, root}),
    read: reader.read,
    root,
    tree: index.tree,
  }
}
