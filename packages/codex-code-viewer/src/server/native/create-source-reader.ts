import {readDeclarationPositions} from './read-declaration-positions'
import type {SourcePoint} from './types'
import typescript from '@typescript/typescript6'
import {resolveFile} from '../file-access'

/** Caches canonical workspace paths and parsed syntax for one metadata epoch. */
export const createSourceReader = (root: string, readFile: typescript.System['readFile']) => {
  const contents = new Map<string, string | undefined>()
  const text = (file: string): string | undefined => {
    if (!contents.has(file)) {
      contents.set(file, readFile(file))
    }
    return contents.get(file)
  }
  const sources = new Map<string, typescript.SourceFile | undefined>()
  const paths = new Map<string, string | undefined>()
  const read = (file: string): typescript.SourceFile | undefined => {
    if (!sources.has(file)) {
      const contents = text(file)
      sources.set(
        file,
        contents === undefined
          ? undefined
          : typescript.createSourceFile(file, contents, typescript.ScriptTarget.Latest, true),
      )
    }
    return sources.get(file)
  }
  return {
    canonical: (file: string): string | undefined => {
      if (!paths.has(file)) {
        const result = resolveFile(root, file)
        paths.set(file, result.ok ? result.value : undefined)
      }
      return paths.get(file)
    },
    counterparts: (source: SourcePoint, file: string): readonly SourcePoint[] => {
      const original = read(source.file)
      const declaration = read(file)
      return original === undefined || declaration === undefined
        ? []
        : readDeclarationPositions({declaration, offset: source.offset, source: original}).map(
            (offset) => ({file, offset, source: declaration.text}),
          )
    },
    read,
    size: (): number => sources.size,
    text,
  }
}
