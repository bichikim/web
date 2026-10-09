import {relative} from 'node:path'
import typescript from '@typescript/typescript6'
import {type CodeLocation, type Result, success} from '../shared/contracts'
import {readSource, resolveFile} from './file-access'
export const getCodeLocation = (
  root: string,
  path: string,
  offset: number,
  sources: ReadonlyMap<string, string>,
): Result<CodeLocation> => {
  const resolved = resolveFile(root, path)
  if (!resolved.ok) {
    return resolved
  }
  const draft = sources.get(resolved.value)
  const source = draft === undefined ? readSource(root, path) : success(draft)
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
