import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {z} from 'zod'
import type {createWorkspace} from '../../src/server/create-workspace'
import {createLspExperiment} from './create-lsp-experiment'
import {createLinkedExperiment} from './create-linked-experiment'

interface WorkspaceModule {
  readonly createWorkspace: typeof createWorkspace
}
const [engine, executable, root, target, needle, kind, manifest, configuration] = z
  .tuple([
    z.enum(['existing', 'native', 'native-inclusive', 'native-linked']),
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.enum(['definition', 'references']),
    z.string(),
    z.string().optional(),
  ])
  .parse(process.argv.slice(2))
const settings = z
  .object({
    concurrency: z.number().int().positive().optional(),
    preparation: z.enum(['cold', 'ready', 'overlap']).default('cold'),
  })
  .parse(configuration === undefined ? {} : JSON.parse(configuration))
const directory = resolve(root)
const source = readFileSync(resolve(directory, target), 'utf8')
const offset = source.indexOf(needle)
if (offset < 0) {
  throw new Error(`Missing query: ${needle}`)
}
const documents = z.array(z.string()).parse(JSON.parse(readFileSync(manifest, 'utf8')))
let first: number | null = null
let started = process.hrtime.bigint()
let positions = new Set<string>()
let batches = 0
let definitions = new Set<string>()
const NANOSECONDS_PER_MILLISECOND = 1_000_000
const elapsed = (): number =>
  Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MILLISECOND
const receive = (locations: readonly {path: string; line: number; column: number}[]): void => {
  const references = locations.filter(
    (location) => !definitions.has(JSON.stringify([location.path, location.line, location.column])),
  )
  if (references.length > 0 && first === null) {
    first = elapsed()
  }
  if (references.length > 0) {
    batches += 1
  }
  references.forEach((location) =>
    positions.add(JSON.stringify([location.path, location.line, location.column])),
  )
}
const workspace =
  engine === 'existing'
    ? ((await import(resolve(executable))) as WorkspaceModule).createWorkspace(directory)
    : undefined
let native:
  | ReturnType<typeof createLspExperiment>
  | ReturnType<typeof createLinkedExperiment>
  | undefined
let preparation: number | undefined
try {
  if (workspace !== undefined && settings.preparation === 'ready') {
    const warmingStarted = process.hrtime.bigint()
    if (!(await workspace.prepareWorkspace())) {
      throw new Error('Workspace preparation failed')
    }
    preparation = Number(process.hrtime.bigint() - warmingStarted) / NANOSECONDS_PER_MILLISECOND
  }
  if (engine === 'native-linked' && settings.preparation !== 'cold') {
    native = createLinkedExperiment({
      binary: executable,
      concurrency: settings.concurrency,
      documents,
      receive,
      root: directory,
    })
    const warming = native.warm()
    const warmingStarted = process.hrtime.bigint()
    if (settings.preparation === 'ready') {
      if (!(await warming)) {
        throw new Error('Native workspace preparation failed')
      }
      preparation = Number(process.hrtime.bigint() - warmingStarted) / NANOSECONDS_PER_MILLISECOND
    }
  }
  for (const phase of ['cold', 'repeat'] as const) {
    const previousBatches = native?.diagnostics().partialBatches ?? 0
    first = null
    positions = new Set()
    batches = 0
    definitions.clear()
    started = process.hrtime.bigint()
    if (workspace === undefined) {
      native ??= (engine === 'native-linked' ? createLinkedExperiment : createLspExperiment)({
        binary: executable,
        concurrency: settings.concurrency,
        documents,
        receive,
        root: directory,
      })
      // Match the viewer's definition-first dispatch without treating the self-definition as a usage result.
      if (kind === 'references' && engine !== 'native-linked') {
        // oxlint-disable-next-line no-await-in-loop -- Preserve the viewer's definition-first request order.
        const found = await native.query({file: target, kind: 'definition', offset, source})
        definitions = new Set(
          found.map((location) => JSON.stringify([location.path, location.line, location.column])),
        )
        first = null
        positions.clear()
        batches = 0
      }
      // oxlint-disable-next-line no-await-in-loop -- Complete each sample before measuring retained state.
      await native.query({
        file: target,
        includeDeclaration: engine === 'native-inclusive',
        kind,
        offset,
        source,
      })
    } else {
      const document = workspace.read(target)
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      // oxlint-disable-next-line no-await-in-loop -- Measure retained state only after the cold query completes.
      for await (const batch of workspace.scanNavigation(
        {
          navigation: 'definition',
          offset,
          path: document.value.location.path,
          revision: document.value.revision,
        },
        new AbortController().signal,
      )) {
        receive(batch.locations)
      }
    }
    const diagnostics = native?.diagnostics()
    console.log(
      JSON.stringify({
        batches,
        complete: elapsed(),
        count: positions.size,
        details:
          diagnostics !== undefined && 'details' in diagnostics ? diagnostics.details : undefined,
        first,
        identities:
          diagnostics !== undefined && 'identities' in diagnostics
            ? diagnostics.identities
            : undefined,
        partialBatches: (native?.diagnostics().partialBatches ?? 0) - previousBatches,
        phase,
        positions: [...positions].sort(),
        preparation,
        stages:
          diagnostics !== undefined && 'stages' in diagnostics ? diagnostics.stages : undefined,
      }),
    )
  }
  if (native !== undefined) {
    console.error(JSON.stringify(native.diagnostics()))
  }
} finally {
  workspace?.dispose()
  await native?.dispose()
}
