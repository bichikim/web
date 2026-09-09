import {type Accessor, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {reportClientError} from '../client-error-reporter'
import {
  type BackgroundMedia,
  type BackgroundPreferences,
  type BackgroundRepository,
  type BackgroundSnapshot,
  DEFAULT_BACKGROUND,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
} from './model'
import {getBackgroundRepository} from './repository'
import {pickNativeMedia} from './picker'

export type BackgroundError = 'load' | 'save' | 'file' | 'size' | 'picker' | 'unsupported'
export interface BackgroundController {
  readonly preferences: Accessor<BackgroundPreferences>
  readonly items: Accessor<readonly BackgroundMedia[]>
  readonly ready: Accessor<boolean>
  readonly busy: Accessor<boolean>
  readonly error: Accessor<BackgroundError | null>
  readonly failedIds: Accessor<readonly string[]>
  readonly configure: (patch: Partial<BackgroundPreferences>) => Promise<void>
  readonly add: (files: readonly File[]) => Promise<void>
  readonly pick: () => Promise<void>
  readonly remove: (id: string) => Promise<void>
  readonly retry: () => Promise<void>
  readonly load: (id: string) => Promise<Blob>
  readonly markFailed: (id: string) => void
}

const retainSnapshot = (
  previous: BackgroundSnapshot,
  result: BackgroundSnapshot,
): BackgroundSnapshot => {
  const existing = new Map(previous.items.map((item) => [item.id, item]))
  const incoming = result.items.map((item) => {
    const current = existing.get(item.id)
    return current !== undefined &&
      current.name === item.name &&
      current.kind === item.kind &&
      current.size === item.size
      ? current
      : item
  })
  const unchanged =
    incoming.length === previous.items.length &&
    incoming.every((item, index) => item === previous.items[index])
  return {...result, items: unchanged ? previous.items : incoming}
}

/** Owns a reactive view of persisted background settings and media operations. */
export const useBackground = (): BackgroundController => {
  const [snapshot, setSnapshot] = createSignal<BackgroundSnapshot>({
    items: [],
    preferences: DEFAULT_BACKGROUND,
  })
  const items = createMemo(() => snapshot().items)
  const [ready, setReady] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<BackgroundError | null>(null)
  const [failedIds, setFailedIds] = createSignal<readonly string[]>([])
  let repository: BackgroundRepository | null = null
  let disposed = false
  let revision = 0
  let unsubscribe: (() => void) | null = null
  const report = (cause: unknown, code: BackgroundError) => {
    if (!disposed) {
      setError(code)
      reportClientError(cause, {feature: 'background', source: 'direct'})
    }
  }
  const refresh = async () => {
    revision += 1
    const currentRevision = revision
    const result = await repository!.read()
    if (!disposed && currentRevision === revision) {
      setSnapshot((previous) => retainSnapshot(previous, result))
      setReady(true)
    }
  }
  const retry = async () => {
    setError(null)
    setFailedIds([])
    try {
      repository ??= await getBackgroundRepository()
      await refresh()
      if (!disposed && unsubscribe === null) {
        unsubscribe = repository.subscribe(
          () => {
            refresh().catch((cause: unknown) => report(cause, 'load'))
          },
          (cause) => report(cause, 'load'),
        )
      }
    } catch (cause) {
      report(cause, 'load')
    }
  }
  onMount(() => {
    retry()
  })
  onCleanup(() => {
    disposed = true
    unsubscribe?.()
  })
  let operations = Promise.resolve()
  let pendingMedia = 0
  const run = (
    operation: (storage: BackgroundRepository) => Promise<void>,
    code: BackgroundError,
    activity: 'media' | 'settings' = 'media',
  ): Promise<void> => {
    const storage = repository
    if (storage === null || !ready() || disposed) {
      return Promise.resolve()
    }
    if (activity === 'media') {
      pendingMedia += 1
      setBusy(true)
    }
    const result = operations.then(async () => {
      setError(null)
      try {
        await operation(storage)
        await refresh()
      } catch (cause) {
        report(cause, code)
      }
    })
    operations = result
    return result.finally(() => {
      if (activity === 'media') {
        pendingMedia -= 1
        if (!disposed) {
          setBusy(pendingMedia > 0)
        }
      }
    })
  }
  const addFiles = async (storage: BackgroundRepository, files: readonly File[]) => {
    await files.reduce(
      (pending, file) =>
        pending.then(async () => {
          const kind = file.type.startsWith('image/')
            ? 'photo'
            : file.type.startsWith('video/')
              ? 'video'
              : null
          if (kind === null || file.size === 0) {
            setError('file')
          } else if (file.size > (kind === 'photo' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES)) {
            setError('size')
          } else {
            try {
              await storage.add(file, kind)
            } catch (cause) {
              report(cause, 'save')
            }
          }
        }),
      Promise.resolve(),
    )
  }

  return {
    add: (files) => run((storage) => addFiles(storage, files), 'save'),
    busy,
    configure: (patch) => run((storage) => storage.configure(patch), 'save', 'settings'),
    error,
    failedIds,
    items,
    load: async (id) => {
      const storage = repository ?? (await getBackgroundRepository())
      return storage.load(id)
    },
    markFailed: (id) => setFailedIds((ids) => (ids.includes(id) ? ids : [...ids, id])),
    pick: () =>
      run(async (storage) => {
        try {
          await addFiles(storage, await pickNativeMedia())
        } catch (cause) {
          const unsupported = cause instanceof Error && cause.message === 'UNSUPPORTED_APP_VERSION'
          report(cause, unsupported ? 'unsupported' : 'picker')
        }
      }, 'picker'),
    preferences: () => snapshot().preferences,
    ready,
    remove: (id) => run((storage) => storage.remove(id), 'save'),
    retry,
  }
}
