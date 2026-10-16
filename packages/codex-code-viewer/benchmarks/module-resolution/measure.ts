import {resolve} from 'node:path'
import {z} from 'zod'
import type {createWorkspace} from '../../src/server/create-workspace'
interface WorkspaceModule {
  readonly createWorkspace: typeof createWorkspace
}
const [bundle, root, target, needle] = z
  .tuple([z.string(), z.string(), z.string(), z.string()])
  .parse(process.argv.slice(2))
const module: WorkspaceModule = await import(resolve(bundle))
const workspace = module.createWorkspace(resolve(root))
const document = workspace.read(target)
if (!document.ok) {
  throw new Error(document.error.code)
}
const offset = document.value.source.indexOf(needle)
if (offset < 0) {
  throw new Error(`Missing query: ${needle}`)
}
const input = {
  navigation: 'definition' as const,
  offset,
  path: document.value.location.path,
  revision: document.value.revision,
}
const NANOSECONDS_PER_MILLISECOND = 1_000_000
try {
  for (const phase of ['cold', 'repeat'] as const) {
    const started = process.hrtime.bigint()
    const elapsed = (): number =>
      Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MILLISECOND
    let first: number | null = null
    const positions = new Set<string>()
    // oxlint-disable-next-line no-await-in-loop -- Repeat against the same retained workspace after completion.
    for await (const batch of workspace.scanNavigation(input, new AbortController().signal)) {
      if (first === null && batch.locations.length > 0) {
        first = elapsed()
      }
      batch.locations.forEach((location) =>
        positions.add(JSON.stringify([location.path, location.line, location.column])),
      )
    }
    console.log(
      JSON.stringify({
        complete: elapsed(),
        count: positions.size,
        first,
        phase,
        positions: [...positions].sort(),
      }),
    )
  }
} finally {
  workspace.dispose()
}
