import {SemanticContext, useSemanticHost} from '../features/semantics'
import {createMemo, createSignal, Match, Show, Switch} from 'solid-js'
import {useWallpaper} from '../features/settings'
import {SWallpaperContent} from './SWallpaperContent'
import {SWallpaperInteraction} from './SWallpaperInteraction'
import {useWallpaperRuntime} from '../features/background/use-wallpaper-runtime'
import {SSegmentedControl} from './SSegmentedControl'
import {SMonitorIcon} from './SMonitorIcon'
import {SGeneralSettings} from './SGeneralSettings'
import {useWallpaperLibrary, useWebsiteNavigation} from '../features/library'
import {useWidgetRuntime} from '../features/poffo'
import {SPoffoWidgetSettings} from './SPoffoWidgetSettings'
import {SPoffoCamera} from './SPoffoCamera'
import {SSettingsNavigation} from './SSettingsNavigation'

export const SWallpaper = () => {
  const wallpaper = useWallpaper()
  const library = useWallpaperLibrary()
  const widgets = useWidgetRuntime(library)
  const semantics = useSemanticHost({widgets: library.widgets})
  useWebsiteNavigation(library)
  const runtime = useWallpaperRuntime({
    monitors: wallpaper.monitors,
    settings: wallpaper.wallpapers,
  })
  const [cameraError, setCameraError] = createSignal<string | null>(null)
  const cameraEnabled = createMemo(
    () =>
      library.widgets().some((widget) => widget.tracking === 'camera') ||
      wallpaper
        .wallpapers()
        .some(
          (entry) =>
            entry.content.mode === 'puppet' &&
            entry.content.assetId !== null &&
            entry.content.tracking === 'camera' &&
            wallpaper.monitors().some((monitor) => monitor.id === entry.monitorId),
        ),
  )
  const reportCamera = (cause: unknown) => {
    console.error('Local Poffo camera failed', cause)
    setCameraError('카메라를 사용할 수 없어요. 카메라 권한과 연결을 확인해 주세요.')
  }
  const monitors = createMemo(() =>
    wallpaper.monitors().map((monitor, index) => ({
      icon: <SMonitorIcon />,
      label: `화면 ${index + 1}`,
      title: monitor.name,
      value: monitor.id,
    })),
  )
  const error = () =>
    wallpaper.error() ?? library.error() ?? widgets.error() ?? runtime.error() ?? cameraError()
  const dismissError = () => {
    wallpaper.dismissError()
    library.dismissError()
    widgets.dismissError()
    runtime.dismissError()
    setCameraError(null)
  }
  return (
    <SemanticContext.Provider value={semantics}>
      <main>
        <SPoffoCamera enabled={cameraEnabled} onError={reportCamera} />
        <h1 class="sr-only">Wallpaper 설정</h1>
        <SSettingsNavigation>
          {(page) => (
            <Switch>
              <Match when={page === 'general'}>
                <SGeneralSettings />
              </Match>
              <Match when={page === 'widget'}>
                <SPoffoWidgetSettings controller={wallpaper} library={library} />
              </Match>
              <Match when={page === 'background' || page === 'interaction'}>
                <Show
                  when={wallpaper.current()}
                  fallback={
                    <p role="status" class="m-0 py-10 text-center text-sm text-stone-600">
                      화면을 불러오고 있어요.
                    </p>
                  }
                >
                  <div class="grid gap-4">
                    <div class="mx-auto w-full max-w-96">
                      <SSegmentedControl
                        label="모니터"
                        options={monitors()}
                        value={wallpaper.selectedId() ?? undefined}
                        onChange={wallpaper.selectMonitor}
                      />
                    </div>
                    <Switch>
                      <Match when={page === 'background'}>
                        <SWallpaperContent controller={wallpaper} library={library} />
                      </Match>
                      <Match when={page === 'interaction'}>
                        <SWallpaperInteraction controller={wallpaper} />
                      </Match>
                    </Switch>
                  </div>
                </Show>
              </Match>
            </Switch>
          )}
        </SSettingsNavigation>
        <Show when={error()}>
          {(message) => (
            <div role="alert" class="wallpaper-notice">
              <span>{message()}</span>
              <button
                type="button"
                class="shrink-0 cursor-pointer border-none bg-transparent text-white underline"
                onClick={dismissError}
              >
                닫기
              </button>
            </div>
          )}
        </Show>
      </main>
    </SemanticContext.Provider>
  )
}
