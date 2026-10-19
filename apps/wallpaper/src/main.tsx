import {render} from 'solid-js/web'
import 'virtual:uno.css'
import {SWallpaper} from './components/SWallpaper'
import {SBackground} from './components/SBackground'
import {SPoffoWidget} from './components/SPoffoWidget'
import {SPoffoSpeechSurface} from './components/SPoffoSpeechSurface'

const root = document.getElementById('root')
if (root === null) {
  throw new Error('Wallpaper root is missing.')
}
const parameters = new URL(location.href).searchParams
const monitorId = parameters.get('monitor')
const widgetId = parameters.get('widget')
document.body.dataset.surface = parameters.get('surface') ?? 'manager'
render(() => {
  switch (parameters.get('surface')) {
    case 'background':
      return monitorId === null ? <SWallpaper /> : <SBackground monitorId={monitorId} />
    case 'widget-bubble':
      return widgetId === null ? <SWallpaper /> : <SPoffoSpeechSurface widgetId={widgetId} />
    case 'widget':
      return widgetId === null ? <SWallpaper /> : <SPoffoWidget id={widgetId} />
    default:
      return <SWallpaper />
  }
}, root)
