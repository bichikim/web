import {dirname, relative, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {createLanguageService} from '../../src/server/create-language-service'

interface ScanOptions {
  readonly root: string
  readonly file: string
  readonly offset: number
  readonly files: readonly string[]
  readonly mode: 'unified' | 'split' | 'split-release'
  readonly receive?: (progress: ProjectProgress) => void
}
interface ProjectProgress {
  readonly project: string
  readonly complete: number
  readonly added: number
  readonly roots: number
  readonly first: number | null
}
const NANOSECONDS_PER_MILLISECOND = 1_000_000
const configuration = (file: string): string =>
  typescript.findConfigFile(dirname(file), typescript.sys.fileExists) ?? dirname(file)

/** Compares one source-config program with sequential per-config programs and a deduplicated union. */
export const createReferenceExperiment = (options: ScanOptions) => {
  const registry = typescript.createDocumentRegistry()
  const services = new Map<string, ReturnType<typeof createLanguageService>>()
  const owner = configuration(options.file)
  const projects = [...Map.groupBy(options.files, configuration)]
    .map(([key, files]) => ({files, key}))
    .sort((left, right) =>
      left.key === owner ? -1 : right.key === owner ? 1 : left.key.localeCompare(right.key),
    )
  const batches = options.mode === 'unified' ? [{files: options.files, key: owner}] : projects
  return {
    dispose: (): void => {
      services.forEach((service) => service.dispose())
      services.clear()
    },
    scan: async () => {
      const started = process.hrtime.bigint()
      const elapsed = (): number =>
        Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MILLISECOND
      let first: number | null = null
      const positions = new Set<string>()
      const timings: {project: string; complete: number; added: number; roots: number}[] = []
      for (const batch of batches) {
        const begin = elapsed()
        const before = positions.size
        let service = services.get(batch.key)
        if (service === undefined) {
          const anchor = batch.key === owner ? options.file : batch.files[0]
          if (anchor === undefined) {
            throw new Error('Project has no source anchor')
          }
          service = createLanguageService(anchor, new Map(), registry)
          services.set(batch.key, service)
        }
        // oxlint-disable-next-line no-await-in-loop -- Measure sequential project completion without concurrent queries.
        for await (const references of service.scanReferences(
          options.file,
          options.offset,
          batch.files,
        )) {
          if (first === null && references.length > 0) {
            first = elapsed()
          }
          references.forEach((entry) =>
            positions.add(
              JSON.stringify([
                relative(options.root, resolve(entry.fileName)),
                entry.textSpan.start,
                entry.textSpan.length,
              ]),
            ),
          )
        }
        const progress = {
          added: positions.size - before,
          complete: elapsed() - begin,
          first,
          project: relative(options.root, batch.key),
          roots: batch.files.length,
        }
        timings.push(progress)
        options.receive?.(progress)
        if (options.mode === 'split-release') {
          service.dispose()
          services.delete(batch.key)
        }
      }
      return {complete: elapsed(), first, positions: [...positions].sort(), timings}
    },
  }
}
