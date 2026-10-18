import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createTimings} from './create-timings'
import {readInputRevisions} from './read-input-revisions'
import {createNativeClient} from './create-native-client'
import {prepareLinkedWorkspace} from './prepare-linked-workspace'
import {createNativeDiscovery} from './create-native-discovery'
import {createQueryPool} from './create-query-pool'
import {createPreparationGate} from './create-preparation-gate'
import {queryNativeSymbol} from './query-native-symbol'
import {withAbort} from '../with-abort'
import type {NativeLocation, NativeOptions, NativePreparationOptions, NativeQuery} from './types'

const initializeSession = (
  disposed: boolean,
  client: () => Promise<ReturnType<typeof createNativeClient>>,
): Promise<boolean> =>
  disposed
    ? Promise.resolve(false)
    : client()
        .then((native) => native.prepare([]))
        .then(
          () => true,
          () => false,
        )

const sourceSnapshotKey = (sources: ReadonlyMap<string, string>): string =>
  JSON.stringify([...sources].sort(([left], [right]) => left.localeCompare(right)))
const matchesSource = (
  root: string,
  sources: ReadonlyMap<string, string>,
  input: NativeQuery,
): boolean =>
  sources.get(resolve(root, input.file)) === input.source ||
  readFileSync(resolve(root, input.file), 'utf8') === input.source

const silent = (): void => undefined
const retainedInputs = (
  checkpoint: ReadonlyMap<string, string | null> | undefined,
): ReadonlyMap<string, string> =>
  new Map([...(checkpoint ?? [])].map(([path, revision]) => [path, revision ?? 'unreadable']))
const scopeNativeClient = (
  client: ReturnType<typeof createNativeClient>,
  signal: AbortSignal | undefined,
  sources: ReadonlyMap<string, string>,
) => ({
  ...client,
  prepare: (
    paths: readonly string[],
    _sources?: ReadonlyMap<string, string>,
    options?: NativePreparationOptions,
  ) => client.prepare(paths, sources, {...options, signal}),
  query: (request: NativeQuery) => client.query({...request, signal, sources}),
})

const inputsChanged = async (
  checkpoint: ReadonlyMap<string, string | null>,
  signal?: AbortSignal,
): Promise<boolean> => {
  const current = await readInputRevisions(
    [...checkpoint.keys()],
    signal ?? new AbortController().signal,
  )
  return [...checkpoint].some(([path, revision]) => current.get(path) !== revision)
}

const createStageMarker =
  (started: bigint, stages: Record<string, number>, release: () => void) =>
  (name: string): void => {
    const NANOSECONDS_PER_MILLISECOND = 1_000_000
    stages[name] = Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MILLISECOND
    if (name === 'initialReferences') {
      release()
    }
  }

interface NavigationOptions extends Omit<NativeOptions, 'binary'> {
  /** 실행 파일 경로나 최초 사용 시 이를 준비하는 비동기 함수를 지정한다. */
  readonly binary: string | (() => Promise<string>)
}

const createClientResolver = (options: NavigationOptions, disposed: () => boolean) => {
  let native: ReturnType<typeof createNativeClient> | undefined
  let starting: Promise<ReturnType<typeof createNativeClient>> | undefined
  const read = (): Promise<ReturnType<typeof createNativeClient>> => {
    if (native !== undefined) {
      return Promise.resolve(native)
    }
    starting ??= Promise.resolve()
      .then(async () => {
        const binary = typeof options.binary === 'string' ? options.binary : await options.binary()
        if (disposed()) {
          throw new Error('Native workspace is disposed')
        }
        native = createNativeClient({...options, binary, documents: [], receive: silent})
        return native
      })
      .finally(() => {
        starting = undefined
      })
    return starting
  }
  return {
    current: () => native,
    dispose: async (): Promise<void> => {
      await native?.dispose()
      native = undefined
    },
    read,
  }
}

/** 네이티브 LSP 결과에 검증된 작업 폴더 선언과 불변 모듈 연결을 더한다. */
export const createNativeNavigation = (options: NavigationOptions) => {
  const lookup = createQueryPool(1)
  const priority = createPreparationGate()
  let checkpoint: ReadonlyMap<string, string | null> | undefined
  let expanded = false
  let disposed = false
  let active = 0
  let warming: Promise<boolean> | undefined
  let resets = 0
  let stages: Record<string, number> = {}
  let timings = createTimings()
  let identityStatistics: Readonly<Record<string, number>> | undefined
  let sources: ReadonlyMap<string, string> = new Map()
  let sourceKey = JSON.stringify([])
  const identities = new Map<string, readonly NativeLocation[]>()
  const client = createClientResolver(options, () => disposed)
  const discovery = createNativeDiscovery(options.root, () => sources)
  const reset = async (): Promise<void> => {
    await client.dispose()
    discovery.clear()
    checkpoint = undefined
    identities.clear()
    expanded = false
    warming = undefined
    resets += 1
  }
  return {
    diagnostics: () => ({
      ...client.current()?.diagnostics(),
      ...discovery.statistics(),
      details: timings.read(),
      identities: identityStatistics,
      resets,
      scope: discovery.scope().size,
      stages,
    }),
    dispose: async (): Promise<void> => {
      disposed = true
      priority.release()
      await client.dispose()
    },
    initialize: (): Promise<boolean> => initializeSession(disposed, client.read),
    inputs: (): ReadonlyMap<string, string> => retainedInputs(checkpoint),
    prioritize: priority.begin,
    query: (input: NativeQuery): Promise<NativeLocation[]> =>
      lookup(async () => {
        if (disposed) {
          throw new Error('Native workspace is disposed')
        }
        active += 1
        try {
          const nextSources = input.sources ?? new Map<string, string>()
          const nextKey = sourceSnapshotKey(nextSources)
          if (nextKey !== sourceKey) {
            if (warming !== undefined) {
              priority.release()
              await (input.signal === undefined ? warming : withAbort(warming, input.signal))
            }
            await reset()
            sources = nextSources
            sourceKey = nextKey
          }
          input.signal?.throwIfAborted()
          const started = process.hrtime.bigint()
          timings = createTimings()
          stages = {}
          const mark = createStageMarker(started, stages, priority.release)
          if (checkpoint !== undefined && (await inputsChanged(checkpoint, input.signal))) {
            await reset()
          }
          mark('invalidated')
          if (!matchesSource(options.root, sources, input)) {
            throw new Error('stale-source')
          }
          const scoped = scopeNativeClient(await client.read(), input.signal, sources)
          if (sources.size > 0) {
            await scoped.prepare([...sources.keys()])
          }
          const preparation = warming
          const {
            checkpoint: snapshot,
            locations,
            statistics,
          } = await queryNativeSymbol({
            allowed: discovery.scope,
            client: scoped,
            concurrency: options.concurrency,
            identities,
            input,
            mark,
            preparation:
              preparation === undefined ? undefined : () => withAbort(preparation, input.signal),
            prepared: expanded,
            receive: input.receive ?? options.receive,
            timings,
            workspace: discovery.read(),
          })
          identityStatistics = statistics
          expanded ||= input.kind === 'references'
          checkpoint = snapshot
          mark('checkpoint')
          return locations
        } catch (error) {
          if (warming === undefined) {
            await reset()
          }
          throw error
        } finally {
          active -= 1
        }
      }),
    seed: discovery.seed,
    /** Starts project preparation once and resolves false when it cannot be retained. */
    warm: (): Promise<boolean> => {
      if (disposed || active > 0) {
        return Promise.resolve(false)
      }
      if (expanded) {
        return Promise.resolve(true)
      }
      warming ??= discovery
        .read()
        .then(async (workspace) => {
          await priority.wait()
          if (disposed || !workspace.hasSources()) {
            await reset()
            return false
          }
          const scoped = scopeNativeClient(await client.read(), undefined, sources)
          checkpoint = await prepareLinkedWorkspace(scoped, workspace, () => active === 0)
          expanded = true
          return !disposed
        })
        .catch(async () => {
          await reset()
          return false
        })
        .finally(() => {
          warming = undefined
        })
      return warming
    },
  }
}
