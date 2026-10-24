import {relative} from 'node:path'
import typescript from '@typescript/typescript6'
import {type CodeLocation, type Result, success} from '../shared/contracts'
import {readSource, resolveFile} from './file-access'

/** Resolves destinations against one source snapshot per file for this request. */
export const createCodeLocationReader = (root: string, sources: ReadonlyMap<string, string>) => {
  const files = new Map<string, Result<typescript.SourceFile>>()
  return (path: string, offset: number): Result<CodeLocation> => {
    let parsed = files.get(path)
    if (parsed === undefined) {
      const resolved = resolveFile(root, path)
      if (!resolved.ok) {
        files.set(path, resolved)
        return resolved
      }
      const draft = sources.get(resolved.value)
      const source = draft === undefined ? readSource(root, path) : success(draft)
      parsed = source.ok
        ? success(typescript.createSourceFile(path, source.value, typescript.ScriptTarget.Latest))
        : source
      files.set(path, parsed)
    }
    if (!parsed.ok) {
      return parsed
    }
    const position = parsed.value.getLineAndCharacterOfPosition(offset)
    return success({
      column: position.character + 1,
      line: position.line + 1,
      path: relative(root, path),
    })
  }
}
