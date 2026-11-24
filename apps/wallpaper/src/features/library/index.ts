import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import {createBuiltinLibrary} from '../builtin-assets/create-builtin-library'
import {codexConversation, resolveConversationModel, useCodexModels} from '../conversation'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
  PoffoTrackingProfile,
} from '@winter-love/wallpaper/settings/tracking'
import {withTrackingProfile} from '@winter-love/wallpaper/settings/with-tracking-profile'
import type {
  PoffoSpeech,
  PoffoWidget,
  RememberedWebsite,
  WebsiteVisit,
} from '@winter-love/wallpaper/settings/library-model'

interface LibraryState {
  history: readonly WebsiteVisit[]
  websites: readonly RememberedWebsite[]
  widgets: readonly PoffoWidget[]
}

/** Owns persistent website addresses, history, and independently opened widgets. */
export const useWallpaperLibrary = () => {
  const repository = createBuiltinLibrary('wallpaper-library')
  const [state, setState] = createStore<LibraryState>({history: [], websites: [], widgets: []})
  const [error, setError] = createSignal<string | null>(null)
  const [ready, setReady] = createSignal(false)
  let disposed = false
  let revision = 0
  let pending = Promise.resolve()
  const changes = new Map<string, {readonly token: symbol; readonly patch: Partial<PoffoWidget>}>()
  const report = (cause: unknown) => {
    if (!disposed) {
      console.error('Wallpaper library operation failed', cause)
      setError('변경 사항을 저장하지 못했어요.')
    }
  }
  const refresh = async () => {
    revision += 1
    const request = revision
    try {
      const snapshot = await repository.read()
      if (!disposed && request === revision) {
        setState('history', reconcile(snapshot.history, {key: 'url'}))
        setState('websites', reconcile(snapshot.websites, {key: 'monitorId'}))
        setState(
          'widgets',
          reconcile(
            snapshot.widgets.map((widget) => ({...widget, ...changes.get(widget.id)?.patch})),
            {key: 'id'},
          ),
        )
        setReady(true)
      }
    } catch (cause) {
      if (!disposed && request === revision) {
        report(cause)
      }
    }
  }
  const run = (operation: () => Promise<unknown>) => {
    setError(null)
    pending = pending
      .then(async () => {
        if (!disposed) {
          await operation()
          await refresh()
        }
      })
      .catch(async (cause: unknown) => {
        report(cause)
        await refresh().catch(report)
      })
    return pending
  }
  const stop = repository.subscribe(refresh, report)
  refresh()
  onCleanup(() => {
    disposed = true
    stop()
    pending.finally(() => repository.close()).catch(report)
  })
  const changeWidget = (id: string, patch: Partial<PoffoWidget>, save: () => Promise<void>) => {
    const token = Symbol()
    changes.set(id, {patch: {...changes.get(id)?.patch, ...patch}, token})
    revision += 1
    setState(
      'widgets',
      reconcile(
        state.widgets.map((widget) => (widget.id === id ? {...widget, ...patch} : widget)),
        {key: 'id'},
      ),
    )
    return run(async () => {
      try {
        await save()
      } finally {
        if (changes.get(id)?.token === token) {
          changes.delete(id)
        }
      }
    })
  }
  const configureSpeech = (id: string, speech: PoffoSpeech) =>
    changeWidget(id, {speech}, () => repository.configureSpeech(id, speech))
  const configureProfile = (
    id: string,
    profile: PoffoTrackingProfile,
    save: (mode: PoffoTracking) => Promise<void>,
  ) => {
    const widget = state.widgets.find((widget) => widget.id === id)
    const mode = widget?.tracking ?? 'off'
    return changeWidget(
      id,
      {trackingProfiles: withTrackingProfile(widget ?? {}, profile, mode)},
      () => save(mode),
    )
  }
  const models = useCodexModels(
    () =>
      codexConversation.available() &&
      state.widgets.some((widget) => widget.speech?.conversation?.provider === 'codex'),
  )
  createEffect(() => {
    const catalog = models.models()
    if (catalog === null || models.loading() || models.error() !== null) {
      return
    }
    const updates = untrack(() =>
      state.widgets.flatMap((widget) => {
        const current = widget.speech?.conversation
        if (current === undefined) {
          return []
        }
        const conversation = resolveConversationModel(current, catalog)
        return conversation === current
          ? []
          : [{id: widget.id, speech: {...widget.speech!, conversation}}]
      }),
    )
    untrack(() => updates.forEach(({id, speech}) => configureSpeech(id, speech)))
  })
  return {
    addWidget: (assetId: string) => run(() => repository.addWidget(assetId)),
    bindWidget: (id: string, trackingBindings: PoffoTrackingBindings) =>
      configureProfile(id, {bindings: trackingBindings}, (mode) =>
        repository.bindWidget(id, trackingBindings, mode),
      ),
    configureSpeech,
    configureTracking: (id: string, trackingOptions: PoffoTrackingOptions) =>
      configureProfile(id, {options: trackingOptions}, (mode) =>
        repository.configureTracking(id, trackingOptions, mode),
      ),
    dismissError: () => setError(null),
    error,
    history: () => state.history,
    lastWebsite: (monitorId: string) =>
      state.websites.find((website) => website.monitorId === monitorId)?.url ?? null,
    ready,
    removeVisit: (url: string) => run(() => repository.removeVisit(url)),
    removeWidget: (id: string) => run(() => repository.removeWidget(id)),
    setWidgetMotion: (id: string, motionId: string | null | undefined) =>
      changeWidget(id, {motionId}, () => repository.setWidgetMotion(id, motionId)),
    trackWidget: (id: string, tracking: PoffoTracking) =>
      changeWidget(id, {tracking}, () => repository.trackWidget(id, tracking)),
    visit: (monitorId: string, url: string) =>
      run(() => repository.visit({monitorId, url, visitedAt: Date.now()})),
    widgets: () => state.widgets,
  }
}

export type WallpaperLibraryController = ReturnType<typeof useWallpaperLibrary>

export * from './use-website-navigation'
