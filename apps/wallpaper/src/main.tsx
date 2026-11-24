import {createResource, ErrorBoundary, lazy, Show, Suspense} from 'solid-js'
import {prepareStorage} from './features/storage-copy'
import {text} from './features/localization'
import {render} from 'solid-js/web'
import 'virtual:uno.css'
import {HInterfaceLanguage} from './components/HInterfaceLanguage'
import {SSettingsLoading} from './components/SSettingsLoading'

const SWallpaper = lazy(async () => ({
  default: (await import('./components/SWallpaper')).SWallpaper,
}))
const SBackground = lazy(async () => ({
  default: (await import('./components/SBackground')).SBackground,
}))
const SPoffoWidget = lazy(async () => ({
  default: (await import('./components/SPoffoWidget')).SPoffoWidget,
}))
const SPoffoSpeechSurface = lazy(async () => ({
  default: (await import('./components/SPoffoSpeechSurface')).SPoffoSpeechSurface,
}))

const root = document.getElementById('root')
if (root === null) {
  throw new Error('Wallpaper root is missing.')
}
const parameters = new URL(location.href).searchParams
const monitorId = parameters.get('monitor')
const widgetId = parameters.get('widget')
const surfaceName = parameters.get('surface') ?? 'manager'
document.body.dataset.surface = surfaceName
const surface = () => {
  switch (surfaceName) {
    case 'background':
      return monitorId === null ? <SWallpaper /> : <SBackground monitorId={monitorId} />
    case 'widget-bubble':
      return widgetId === null ? <SWallpaper /> : <SPoffoSpeechSurface widgetId={widgetId} />
    case 'widget':
      return widgetId === null ? <SWallpaper /> : <SPoffoWidget id={widgetId} />
    default:
      return <SWallpaper />
  }
}
render(() => {
  const [ready] = createResource(prepareStorage)
  return (
    <HInterfaceLanguage>
      <ErrorBoundary fallback={<p role="alert">{text('설정을 불러오지 못했어요.')}</p>}>
        <Suspense
          fallback={
            surfaceName === 'manager' ? (
              <SSettingsLoading fill />
            ) : (
              <p role="status">{text('기존 설정을 준비하고 있어요…')}</p>
            )
          }
        >
          <Show when={ready()}>{surface()}</Show>
        </Suspense>
      </ErrorBoundary>
    </HInterfaceLanguage>
  )
}, root)
