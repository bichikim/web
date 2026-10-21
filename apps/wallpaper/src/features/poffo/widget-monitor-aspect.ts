import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {WallpaperMonitor} from '../settings/monitors'
import {findWidgetMonitor} from './find-widget-monitor'

const DEFAULT_MONITOR = {height: 9, width: 16}
/** Resolves the monitor containing the widget center using physical desktop coordinates. */
export const widgetMonitorAspect = (
  widget: PoffoWidget,
  monitors: readonly WallpaperMonitor[],
): number => {
  const monitor = findWidgetMonitor(widget, monitors)
  return (monitor?.width ?? DEFAULT_MONITOR.width) / (monitor?.height ?? DEFAULT_MONITOR.height)
}
