import {createLocationSet} from './create-location-set'
import {scanLinkedReferences} from './scan-linked-references'
import {createSymbolIdentities} from './create-symbol-identities'
import type {createNativeClient} from './create-native-client'
import type {createWorkspaceLinks} from './create-workspace-links'
import type {createTimings} from './create-timings'
import type {NativeLocation, NativeQuery} from './types'

interface QueryNativeOptions {
  readonly allowed: () => ReadonlySet<string>
  readonly client: ReturnType<typeof createNativeClient>
  readonly workspace: Promise<ReturnType<typeof createWorkspaceLinks>>
  readonly identities: Map<string, readonly NativeLocation[]>
  readonly input: NativeQuery
  readonly concurrency?: number
  readonly prepared: boolean
  readonly preparation?: () => Promise<boolean>
  readonly mark: (name: string) => void
  readonly timings: ReturnType<typeof createTimings>
  readonly receive: (locations: readonly NativeLocation[]) => unknown
}

/** Publishes canonical definitions or source-first references and verifies workspace linking edges. */
export const queryNativeSymbol = async (options: QueryNativeOptions) => {
  const [workspace, initial] = await Promise.all([
    options.workspace.then(async (workspace) => {
      const receive =
        options.input.kind === 'references' ? options.receive : options.input.receiveOwnReferences
      if (receive !== undefined) {
        options.input.signal?.throwIfAborted()
        const found = workspace.directReferences(options.input)
        options.input.signal?.throwIfAborted()
        if (found.length > 0) {
          await receive(found)
          options.input.signal?.throwIfAborted()
          options.mark('directReferences')
          const imported = new Set(
            found.map(({path, line, column}) => JSON.stringify([path, line, column])),
          )
          const usages = workspace
            .directReferences(options.input, true)
            .filter(({path, line, column}) => !imported.has(JSON.stringify([path, line, column])))
          options.input.signal?.throwIfAborted()
          if (usages.length > 0) {
            await receive(usages)
          }
          options.input.signal?.throwIfAborted()
          options.mark('directUsages')
        }
      }
      return workspace
    }),
    options.client.query({...options.input, kind: 'definition', receive: () => undefined}),
  ])
  options.mark('initialDefinition')
  const symbols = createSymbolIdentities(
    workspace,
    options.client,
    options.identities,
    options.concurrency,
  )
  const definitions = await symbols.canonicalize(initial)
  if (options.input.kind === 'definition') {
    await options.receive(definitions)
    const checkpoint = await workspace.checkpoint()
    return {checkpoint, locations: definitions, statistics: symbols.statistics()}
  }
  const locations = createLocationSet({
    allowed: options.allowed(),
    definitions,
    receive: options.receive,
    workspace,
  })
  await scanLinkedReferences({...options, definitions, locations, symbols, workspace})
  const checkpoint = await workspace.checkpoint()
  return {checkpoint, locations: locations.read(), statistics: symbols.statistics()}
}
