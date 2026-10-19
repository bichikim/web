import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {WallpaperMonitor} from '../settings/monitors'
import type {CameraSurface} from '../tracking/types'
import {findWidgetMonitor} from './find-widget-monitor'
const DEFAULT_WIDGET = {height: 420, width: 320}

/** Projects widget render bounds into its monitor's normalized coordinates. */
export const widgetCameraSurface = (
  widget: PoffoWidget,
  monitors: readonly WallpaperMonitor[],
): CameraSurface | undefined => {
  const monitor = findWidgetMonitor(widget, monitors)
  if (monitor?.width === undefined || monitor.height === undefined) {
    return undefined
  }
  const scale = monitor.scale ?? 1
  const width = (widget.size?.width ?? DEFAULT_WIDGET.width) * scale
  const height = (widget.size?.height ?? DEFAULT_WIDGET.height) * scale
  const left = monitor.x ?? 0
  const top = monitor.y ?? 0
  return {
    aspect: monitor.width / monitor.height,
    height: height / monitor.height,
    left: ((widget.x ?? left + (monitor.width - width) / 2) - left) / monitor.width,
    top: ((widget.y ?? top + (monitor.height - height) / 2) - top) / monitor.height,
    width: width / monitor.width,
  }
}
