import {createHash} from 'node:crypto'
import {readdirSync, realpathSync} from 'node:fs'
import {dirname, join, relative, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {
  type CodeDocument,
  type CodeLocation,
  failure,
  type Result,
  success,
} from '../shared/contracts'
import {createLanguageService} from './create-language-service'
import {findWorkspace, readSource, resolveFile} from './file-access'
import {tokenizeSource} from './tokenize-source'
import {isBrowsablePath} from './is-browsable-path'
import {readDirectory} from './read-directory'
const MAX_FILES = 10000
const MAX_RESULTS = 100

export const createWorkspace = (anchor: string) => {
  const canonical = realpathSync(anchor)
  const root = findWorkspace(canonical)
  const language = createLanguageService(canonical)
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
  const read = (path: string, line = 1, column = 1): Result<CodeDocument> => {
    const resolved = resolveFile(root, path)
    if (!resolved.ok) {
      return resolved
    }
    const source = readSource(root, path)
    if (!source.ok) {
      return source
    }
    const lines = tokenizeSource(path, source.value)
    const targetLine = Math.min(Math.max(1, line), lines.length)
    return success({
      lines,
      location: {column, line: targetLine, path: relative(root, resolved.value)},
      revision: createHash('sha256').update(source.value).digest('hex'),
      source: source.value,
    })
  }
  const definitions = (path: string, offset: number): Result<CodeLocation[]> => {
    const source = readSource(root, path)
    if (!source.ok) {
      return source
    }
    if (offset < 0 || offset >= source.value.length) {
      return failure('invalid-position')
    }
    const targets = language.definitions(resolve(root, path), offset)
    const locations = targets.flatMap((target) => {
      const location = getLocation(target.fileName, target.textSpan.start)
      return location.ok ? [location.value] : []
    })
    return success(locations)
  }
  const followPath = (path: string, offset: number): Result<CodeLocation[]> => {
    const source = readSource(root, path)
    if (!source.ok) {
      return source
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
  const list = (query: string): string[] => {
    const paths: string[] = []
    const visit = (directory: string): void => {
      const entries = readdirSync(directory, {withFileTypes: true})
      for (const entry of entries) {
        if (paths.length < MAX_FILES && isBrowsablePath(entry.name)) {
          const path = join(directory, entry.name)
          if (entry.isDirectory()) {
            visit(path)
          } else if (entry.isFile() && resolveFile(root, path).ok) {
            paths.push(relative(root, path))
          }
        }
      }
    }
    visit(root)
    return paths
      .filter((path) => path.toLowerCase().includes(query.toLowerCase()))
      .sort()
      .slice(0, MAX_RESULTS)
  }
  return {
    definitions,
    dispose: language.dispose,
    followPath,
    list,
    read,
    root,
    tree: () => readDirectory(root),
  }
}
