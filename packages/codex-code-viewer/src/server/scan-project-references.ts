import type typescript from '@typescript/typescript6'
import {readReferenceCandidates} from './read-reference-candidates'
import {scanTypeScriptReferences} from './scan-typescript-references'
import {collectModuleBindingReferences} from './collect-module-binding-references'

interface ScanProjectReferencesOptions {
  readonly file: string
  readonly candidates?: readonly string[]
  readonly offset: number
  readonly paths: readonly string[]
  readonly retained: readonly string[]
  readonly complete: boolean
  readonly cancelled?: () => boolean
  readonly service: Pick<typescript.LanguageService, 'findReferences' | 'getProgram'>
  readonly read: (path: string) => string | undefined
  readonly prepare: (paths: readonly string[]) => void
  readonly preload?: (paths: readonly string[], cancelled?: () => boolean) => Promise<void>
  readonly scope: (file: string, paths: readonly string[], cancelled?: () => boolean) => string[]
}
/** Emits preliminary module references before completing the full semantic project query. */
export async function* scanProjectReferences(
  options: ScanProjectReferencesOptions,
): AsyncGenerator<readonly typescript.ReferencedSymbolEntry[]> {
  const source = options.read(options.file)
  const retained = new Set(options.retained)
  const prepared = options.paths.every((path) => retained.has(path))
  const candidates =
    !options.complete || prepared || source === undefined
      ? []
      : readReferenceCandidates({...options, source})
  if (candidates.length > 0) {
    options.prepare([...options.retained, ...candidates])
    yield (options.service.findReferences(options.file, options.offset) ?? []).flatMap((symbol) =>
      symbol.references.filter((reference) => reference.isDefinition !== true),
    )
  }
  const paths = options.complete
    ? options.scope(options.file, options.paths, options.cancelled)
    : options.paths
  options.prepare(paths)
  await options.preload?.(paths, options.cancelled)
  const program = options.service.getProgram()
  if (program !== undefined) {
    // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
    yield* scanTypeScriptReferences({
      cancelled: options.cancelled,
      complete: () => options.service.findReferences(options.file, options.offset) ?? [],
      file: options.file,
      offset: options.offset,
      program,
    })
    yield collectModuleBindingReferences({
      cancelled: options.cancelled,
      file: options.file,
      offset: options.offset,
      program,
      references: (file, offset) => options.service.findReferences(file, offset) ?? [],
    })
  }
}
