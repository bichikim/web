import {realpathSync} from 'node:fs'
import {dirname, extname, relative, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {type CodeLocation, failure, type Result, success} from '../shared/contracts'
import {createRustNavigation} from './create-rust-navigation'
import {createLanguageService} from './create-language-service'
import {findWorkspace, readSource, resolveFile} from './file-access'
import {createDocumentReader} from './create-document-reader'
import {createFileIndex} from './create-file-index'
import {readMedia} from './read-media'

export const createWorkspace = (anchor: string) => {
  const canonical = realpathSync(anchor)
  const root = findWorkspace(canonical)
  const language = createLanguageService(canonical)
  const rust = createRustNavigation(root)
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
    if (extname(path) === '.rs') {
      const file = resolveFile(root, path)
      return file.ok ? rust.definitions(file.value, source.value, offset) : file
    }
    const targets = language.definitions(resolve(root, path), offset)
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
    if (extname(path) === '.rs') {
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
    const module = language.resolveModule(file, specifier)
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
      language.dispose()
      rust.dispose()
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
