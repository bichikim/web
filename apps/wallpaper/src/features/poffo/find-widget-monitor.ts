import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {WallpaperMonitor} from '../settings/monitors'
const DEFAULT_WIDGET = {height: 420, width: 320}

export const findWidgetMonitor = (widget: PoffoWidget, monitors: readonly WallpaperMonitor[]) => {
  return (
    monitors.find((candidate) => {
      if (
        widget.x === null ||
        widget.y === null ||
        candidate.x === undefined ||
        candidate.y === undefined ||
        candidate.width === undefined ||
        candidate.height === undefined
      ) {
        return false
      }
      const scale = candidate.scale ?? 1
      const x = widget.x + ((widget.size?.width ?? DEFAULT_WIDGET.width) * scale) / 2
      const y = widget.y + ((widget.size?.height ?? DEFAULT_WIDGET.height) * scale) / 2
      return (
        x >= candidate.x &&
        x < candidate.x + candidate.width &&
        y >= candidate.y &&
        y < candidate.y + candidate.height
      )
    }) ?? monitors[0]
  )
}
