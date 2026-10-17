import {setImmediate} from 'node:timers/promises'
import {basename} from 'node:path'
import typescript from '@typescript/typescript6'
import {z} from 'zod'

interface ReferenceEngine {
  findReferencedSymbols(
    program: typescript.Program,
    cancellation: typescript.CancellationToken,
    files: readonly typescript.SourceFile[],
    source: typescript.SourceFile,
    offset: number,
  ): readonly typescript.ReferencedSymbol[] | undefined
}
interface ScanReferencesOptions {
  readonly program: typescript.Program
  readonly file: string
  readonly offset: number
  readonly cancelled?: () => boolean
  readonly complete: () => readonly typescript.ReferencedSymbol[]
}
const engineSchema = z.object({
  FindAllReferences: z.object({
    findReferencedSymbols: z.custom<ReferenceEngine['findReferencedSymbols']>(
      (value) => typeof value === 'function',
    ),
  }),
})
const entries = (
  symbols: readonly typescript.ReferencedSymbol[],
): typescript.ReferencedSymbolEntry[] =>
  symbols.flatMap((symbol) =>
    symbol.references.filter((reference) => reference.isDefinition !== true),
  )
const FIRST_WINDOW = 32
const SECOND_WINDOW = 256
const THIRD_WINDOW = 1024
const SEARCH_WINDOWS = [FIRST_WINDOW, SECOND_WINDOW, THIRD_WINDOW]

/** Searches bounded file sets against one complete semantic program, then completes the project query. */
export async function* scanTypeScriptReferences(
  options: ScanReferencesOptions,
): AsyncGenerator<readonly typescript.ReferencedSymbolEntry[]> {
  const cancellation: typescript.CancellationToken = {
    isCancellationRequested: () => options.cancelled?.() === true,
    throwIfCancellationRequested: () => {
      if (options.cancelled?.() === true) {
        throw new typescript.OperationCanceledException()
      }
    },
  }
  const engine = engineSchema.safeParse(typescript)
  const source = options.program.getSourceFile(options.file)
  if (engine.success && source !== undefined) {
    const files = options.program
      .getSourceFiles()
      .filter((file) => file !== source && !file.isDeclarationFile)
    const word = source.text.slice(options.offset).match(/^[\p{L}\p{N}_$]+/u)?.[0] ?? ''
    const module = basename(options.file).replace(/\.[cm]?[jt]sx?$/u, '')
    const priority = (file: typescript.SourceFile): number =>
      Number(file.text.includes(module)) * 2 + Number(file.text.includes(word))
    // Prioritize likely callers without removing other files from the semantic program or final search.
    const prioritized = files
      .map((file) => ({file, priority: priority(file)}))
      .sort((left, right) => right.priority - left.priority)
      .map(({file}) => file)
    prioritized.unshift(source)
    for (const size of SEARCH_WINDOWS) {
      if (size < prioritized.length) {
        cancellation.throwIfCancellationRequested()
        const found = engine.data.FindAllReferences.findReferencedSymbols(
          options.program,
          cancellation,
          prioritized.slice(0, size),
          source,
          options.offset,
        )
        yield entries(found ?? [])
        // Let worker messages deliver discoveries and cancellation between semantic batches.
        // oxlint-disable-next-line no-await-in-loop -- Yield after each semantic batch so its results can be consumed.
        await setImmediate()
      }
    }
  }
  cancellation.throwIfCancellationRequested()
  yield entries(options.complete())
}
