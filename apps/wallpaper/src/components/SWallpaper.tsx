import {localizeMessage, text as uiText} from '../features/localization'

import {SemanticContext, useSemanticHost} from '../features/semantics'
import {batch, createMemo, createSignal, Match, Show, Switch} from 'solid-js'
import {useWallpaper} from '../features/settings'
import {SWallpaperContent} from './SWallpaperContent'
import {SWallpaperInteraction} from './SWallpaperInteraction'
import {useWallpaperRuntime} from '../features/background/use-wallpaper-runtime'
import {SMonitorNavigation} from './SMonitorNavigation'
import {SGeneralSettings} from './SGeneralSettings'
import {useWallpaperLibrary, useWebsiteNavigation} from '../features/library'
import {useWidgetRuntime} from '../features/poffo'
import {SPoffoWidgetSettings} from './SPoffoWidgetSettings'
import {SPoffoCamera} from './SPoffoCamera'
import {type SettingsPage, SSettingsNavigation} from './SSettingsNavigation'
import {SSettingsLoading} from './SSettingsLoading'
import {SThemeSettings, type ThemePage} from './SThemeSettings'
import {useThemes} from '../features/themes'
import {useSettingsVisibility} from '../features/settings-navigation/use-settings-visibility'

export const SWallpaper = () => {
  const wallpaper = useWallpaper()
  const [page, setPage] = createSignal<SettingsPage>('background')
  const visible = useSettingsVisibility()
  const [themePage, setThemePage] = createSignal<ThemePage>('overview')
  const themes = useThemes({
    monitors: wallpaper.monitors,
    onOpen: () =>
      batch(() => {
        setThemePage('import')
        setPage('theme')
      }),
    selectedId: wallpaper.selectedId,
  })
  const library = useWallpaperLibrary()
  const widgets = useWidgetRuntime(library)
  const semantics = useSemanticHost({widgets: library.widgets})
  useWebsiteNavigation(library)
  const runtime = useWallpaperRuntime({
    monitors: wallpaper.monitors,
    settings: wallpaper.wallpapers,
  })
  const [cameraError, setCameraError] = createSignal<string | null>(null)
  const cameraModes = createMemo(() => [
    ...library.widgets().map((widget) => widget.tracking),
    ...wallpaper
      .wallpapers()
      .flatMap((entry) =>
        entry.content.mode === 'puppet' &&
        entry.content.assetId !== null &&
        wallpaper.monitors().some((monitor) => monitor.id === entry.monitorId)
          ? [entry.content.tracking]
          : [],
      ),
  ])
  const cameraPose = createMemo(() => cameraModes().includes('camera-pose'))
  const cameraEnabled = createMemo(() => cameraPose() || cameraModes().includes('camera'))
  const reportCamera = (cause: unknown) => {
    console.error('Local Poffo camera failed', cause)
    setCameraError(uiText('카메라를 사용할 수 없어요. 카메라 권한과 연결을 확인해 주세요.'))
  }
  const error = () =>
    wallpaper.error() ?? library.error() ?? widgets.error() ?? runtime.error() ?? cameraError()
  const dismissError = () => {
    wallpaper.dismissError()
    library.dismissError()
    widgets.dismissError()
    runtime.dismissError()
    setCameraError(null)
  }
  const navigateTheme = (next: ThemePage) =>
    batch(() => {
      themes.dismissFeedback()
      setThemePage(next)
    })
  return (
    <SemanticContext.Provider value={semantics}>
      <main>
        <SPoffoCamera pose={cameraPose} enabled={cameraEnabled} onError={reportCamera} />
        <Show when={visible()}>
          <h1 class="sr-only">{uiText('Wallpaper 설정')}</h1>
          <SSettingsNavigation value={page()} onChange={setPage}>
            {(page) => (
              <Switch>
                <Match when={page === 'theme'}>
                  <SThemeSettings
                    controller={wallpaper}
                    library={library}
                    page={themePage()}
                    themes={themes}
                    onPageChange={navigateTheme}
                  />
                </Match>
                <Match when={page === 'general'}>
                  <SGeneralSettings />
                </Match>
                <Match when={page === 'widget'}>
                  <SPoffoWidgetSettings controller={wallpaper} library={library} />
                </Match>
                <Match when={page === 'background' || page === 'interaction'}>
                  <Show when={wallpaper.current()} fallback={<SSettingsLoading />}>
                    <SMonitorNavigation
                      controller={wallpaper}
                      placement={page === 'background' ? 'header' : 'content'}
                    >
                      <Switch>
                        <Match when={page === 'background'}>
                          <SWallpaperContent controller={wallpaper} library={library} />
                        </Match>
                        <Match when={page === 'interaction'}>
                          <SWallpaperInteraction controller={wallpaper} />
                        </Match>
                      </Switch>
                    </SMonitorNavigation>
                  </Show>
                </Match>
              </Switch>
            )}
          </SSettingsNavigation>
          <Show when={error()}>
            {(message) => (
              <div role="alert" class="wallpaper-notice">
                <span>{localizeMessage(message() ?? '')}</span>
                <button
                  type="button"
                  class="shrink-0 cursor-pointer border-none bg-transparent text-white underline"
                  onClick={dismissError}
                >
                  {uiText('닫기')}
                </button>
              </div>
            )}
          </Show>
        </Show>
      </main>
    </SemanticContext.Provider>
  )
}
