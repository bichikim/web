import {readFileSync} from 'node:fs'
import typescript from '@typescript/typescript6'

/** Reads compiler source with UTF-8, BOM and UTF-16 behavior matching the TypeScript system. */
export const readCompilerSource = (file: string): string | undefined => {
  let source: string
  try {
    source = readFileSync(file, 'utf8')
  } catch (error) {
    return error instanceof Error && 'errno' in error ? undefined : typescript.sys.readFile(file)
  }
  if (source.startsWith('\uFFFD\uFFFD')) {
    return typescript.sys.readFile(file)
  }
  return source.startsWith('\uFEFF') ? source.slice(1) : source
}
