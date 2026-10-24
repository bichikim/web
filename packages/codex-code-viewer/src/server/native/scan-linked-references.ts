import type {createTimings} from './create-timings'
import type {createNativeClient} from './create-native-client'
import type {createWorkspaceLinks} from './create-workspace-links'
import type {createSymbolIdentities} from './create-symbol-identities'
import type {createLocationSet} from './create-location-set'
import type {NativeLocation, SourcePoint} from './types'

interface ScanOptions {
  readonly concurrency?: number
  readonly client: ReturnType<typeof createNativeClient>
  readonly definitions: readonly NativeLocation[]
  readonly locations: ReturnType<typeof createLocationSet>
  readonly mark: (name: string) => void
  readonly prepared: boolean
  readonly preparation?: () => Promise<boolean>
  readonly symbols: Pick<ReturnType<typeof createSymbolIdentities>, 'read'>
  readonly timings: ReturnType<typeof createTimings>
  readonly workspace: Pick<
    ReturnType<typeof createWorkspaceLinks>,
    'point' | 'documents' | 'prepare' | 'companions' | 'location' | 'bindings'
  >
}

/** Streams native source results before expanding verified declaration and binding queries. */
export const scanLinkedReferences = async ({
  client,
  concurrency = 2,
  definitions,
  locations,
  mark,
  prepared,
  preparation,
  symbols,
  timings,
  workspace,
}: ScanOptions): Promise<void> => {
  const origins = definitions.flatMap((definition) => workspace.point(definition) ?? [])
  const references = async (point: SourcePoint): Promise<void> => {
    await client.query({
      ...point,
      includeDeclaration: true,
      kind: 'references',
      receive: locations.publish,
    })
  }
  for (const origin of origins) {
    // oxlint-disable-next-line no-await-in-loop -- Publish the selected project's results before expanding the workspace.
    await references(origin)
  }
  mark('initialReferences')
  const retained = prepared || (await preparation?.()) === true
  const expand = (): void => {
    timings.measure('metadata', () => workspace.prepare())
    mark('metadata')
  }
  if (retained) {
    expand()
  } else {
    const sent = Promise.withResolvers<void>()
    const loading = timings.measureAsync('projectPreparation', () =>
      client.prepare(
        timings.measure('projectDocuments', () => workspace.documents()),
        undefined,
        {dispatched: sent.resolve},
      ),
    )
    const settled = Promise.allSettled([loading])
    await Promise.race([sent.promise, loading])
    mark('dispatched')
    try {
      // Expand only after the actual write so the native child can prepare in parallel.
      expand()
    } finally {
      // Drain the shared native operation before a metadata failure can reset its session.
      await settled
    }
    await loading
    mark('opened')
  }
  for (const origin of origins) {
    // A warmup joined after the initial query can add projects that still need searching.
    if (!prepared) {
      // oxlint-disable-next-line no-await-in-loop -- Query sources after the first expansion, preserving streaming order.
      await timings.measureAsync('expandedSource', () => references(origin))
      if (!retained && origin === origins[0]) {
        mark('projectsReady')
      }
    }
    const declarations = timings.measure('declarationCandidates', () =>
      workspace.companions(origin),
    )
    for (const declaration of declarations) {
      const location = workspace.location(declaration)
      locations.exclude(location)
      // oxlint-disable-next-line no-await-in-loop -- Verify the declaration edge before publishing its references.
      const verified = await timings.measureAsync('declarationIdentity', () =>
        symbols.read(declaration),
      )
      if (locations.matches(verified)) {
        // oxlint-disable-next-line no-await-in-loop -- Merge only declarations that resolve to the selected canonical symbol.
        await timings.measureAsync('declarationReferences', () => references(declaration))
      }
    }
  }
  mark('declarations')
  const verifyBinding = async (binding: ReturnType<typeof workspace.bindings>[number]) => {
    const verified = await timings.measureAsync('bindingIdentity', () =>
      symbols.read(binding.property),
    )
    if (locations.matches(verified)) {
      await locations.publish([workspace.location(binding.property)])
      // The LSP local-symbol query excludes shadowed parameters and unrelated aliases.
      await timings.measureAsync('bindingReferences', () => references(binding.local))
    }
  }
  const bindings = workspace.bindings()
  for (let offset = 0; offset < bindings.length; offset += concurrency) {
    // oxlint-disable-next-line no-await-in-loop -- Drain active queries before a failed scan resets the native session.
    const batch = await Promise.allSettled(
      bindings.slice(offset, offset + concurrency).map(verifyBinding),
    )
    const failed = batch.find((result) => result.status === 'rejected')
    if (failed?.status === 'rejected') {
      throw failed.reason
    }
  }
  mark('bindings')
}
