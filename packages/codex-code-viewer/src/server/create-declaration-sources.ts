import {realpathSync} from 'node:fs'
import {basename, dirname, relative, resolve, sep} from 'node:path'
import typescript from '@typescript/typescript6'
import {z} from 'zod'
import {isWithin} from './file-access'
const SOURCE_MAP_VERSION = 3
const declarationMap = z.object({
  file: z.string(),
  mappings: z.string(),
  sourceRoot: z.string().optional(),
  sources: z.tuple([z.string()]),
  version: z.literal(SOURCE_MAP_VERSION),
})
const packageEntries = z.object({source: z.string(), types: z.string()})
const declarationExtension = /\.d\.(?:ts|mts|cts)$/u
const sourceExtensions = new Map<string, readonly string[]>([
  ['.d.mts', ['.mts', '.mjs']],
  ['.d.cts', ['.cts', '.cjs']],
  ['.d.ts', ['.ts', '.tsx', '.js', '.jsx']],
])
const sourceExtension = /(?<!\.d)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u

/** Resolves workspace declaration modules to their mapped or package-declared source modules. */
export const createDeclarationSources = (
  root: string,
  read: (path: string) => string | undefined = typescript.sys.readFile,
) => {
  const readJson = (path: string): unknown => {
    try {
      return JSON.parse(read(path) ?? '')
    } catch {
      return undefined
    }
  }
  const manifests = new Map<string, ReturnType<typeof packageEntries.safeParse>>()
  const existence = new Map<string, boolean>()
  const fileExists = (path: string): boolean => {
    if (!existence.has(path)) {
      existence.set(path, typescript.sys.fileExists(path))
    }
    return existence.get(path) === true
  }
  const cache = new Map<string, string | undefined>()
  const source = (path: string): string | undefined => {
    if (!sourceExtension.test(path) || !typescript.sys.fileExists(path)) {
      return undefined
    }
    const canonical = realpathSync(path)
    return isWithin(root, canonical) &&
      !relative(root, canonical).split(sep).includes('node_modules')
      ? canonical
      : undefined
  }
  const mapped = (path: string): string | undefined => {
    const text = read(path) ?? ''
    const maps = [...text.matchAll(/^\s*\/\/[#@]\s*sourceMappingURL=(?<name>\S+)\s*$/gmu)]
    const name = maps.at(-1)?.groups?.name
    if (name === undefined || name.includes(':')) {
      return undefined
    }
    const mapFile = resolve(dirname(path), name)
    if (!isWithin(root, mapFile)) {
      return undefined
    }
    const map = declarationMap.safeParse(readJson(mapFile))
    if (!map.success || basename(path) !== map.data.file) {
      return undefined
    }
    return source(resolve(dirname(mapFile), map.data.sourceRoot ?? '', map.data.sources[0]))
  }
  const packaged = (path: string): string | undefined => {
    const manifest = typescript.findConfigFile(dirname(path), fileExists, 'package.json')
    if (manifest === undefined || !isWithin(root, manifest)) {
      return undefined
    }
    if (!manifests.has(manifest)) {
      manifests.set(manifest, packageEntries.safeParse(readJson(manifest)))
    }
    const entries = manifests.get(manifest)
    if (entries === undefined) {
      return undefined
    }
    if (!entries.success) {
      return undefined
    }
    const directory = dirname(manifest)
    const declaration = resolve(directory, entries.data.types)
    const entry = resolve(directory, entries.data.source)
    if (!isWithin(directory, declaration) || !isWithin(directory, entry)) {
      return undefined
    }
    if (path === declaration) {
      return source(entry)
    }
    if (!isWithin(dirname(declaration), path)) {
      return undefined
    }
    const stem = resolve(dirname(entry), relative(dirname(declaration), path)).replace(
      declarationExtension,
      '',
    )
    const suffix = path.match(declarationExtension)?.[0] ?? ''
    const candidate = (sourceExtensions.get(suffix) ?? [])
      .map((extension) => `${stem}${extension}`)
      .find(fileExists)
    return candidate === undefined ? undefined : source(candidate)
  }
  return {
    clear: () => {
      cache.clear()
      manifests.clear()
      existence.clear()
    },
    read: (path: string): string | undefined => {
      if (
        !declarationExtension.test(path) ||
        !isWithin(root, path) ||
        relative(root, path).split(sep).includes('node_modules')
      ) {
        return undefined
      }
      if (!cache.has(path)) {
        cache.set(path, mapped(path) ?? packaged(path))
      }
      return cache.get(path)
    },
  }
}
