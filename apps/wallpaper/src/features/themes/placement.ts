import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_WIDGET, findWidgetMonitor} from '../poffo/find-widget-monitor'
import type {WallpaperMonitor} from '../settings/monitors'

const DEFAULT_POSITION = 0.5
const DESIGN_WIDTH = 1280
const DESIGN_HEIGHT = 720

const clamp = (value: number) => Math.min(1, Math.max(0, value))

const visibleArea = (widget: PoffoWidget, monitor: WallpaperMonitor) => {
  const {x, y, width, height, scale = 1} = monitor
  if (
    widget.x === null ||
    widget.y === null ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return 0
  }
  const right = widget.x + (widget.size?.width ?? DEFAULT_WIDGET.width) * scale
  const bottom = widget.y + (widget.size?.height ?? DEFAULT_WIDGET.height) * scale
  const overlapWidth = Math.min(right, x + width) - Math.max(widget.x, x)
  const overlapHeight = Math.min(bottom, y + height) - Math.max(widget.y, y)
  return Math.max(0, overlapWidth) * Math.max(0, overlapHeight)
}

export const findThemeWidgetMonitor = (
  widget: PoffoWidget,
  monitors: readonly WallpaperMonitor[],
) => {
  const fallback = findWidgetMonitor(widget, monitors)
  const overlaps = monitors.map((monitor) => ({area: visibleArea(widget, monitor), monitor}))
  return overlaps.reduce(
    (selected, candidate) => (candidate.area > selected.area ? candidate : selected),
    {area: fallback === undefined ? 0 : visibleArea(widget, fallback), monitor: fallback},
  ).monitor
}

export const exportPlacement = (widget: PoffoWidget, monitor: WallpaperMonitor) => {
  const scale = monitor.scale ?? 1
  const width = (widget.size?.width ?? DEFAULT_WIDGET.width) * scale
  const height = (widget.size?.height ?? DEFAULT_WIDGET.height) * scale
  return {
    x:
      widget.x === null
        ? DEFAULT_POSITION
        : clamp((widget.x + width / 2 - (monitor.x ?? 0)) / (monitor.width ?? DESIGN_WIDTH)),
    y:
      widget.y === null
        ? DEFAULT_POSITION
        : clamp((widget.y + height / 2 - (monitor.y ?? 0)) / (monitor.height ?? DESIGN_HEIGHT)),
  }
}

export const importPlacement = (
  widget: {readonly x: number; readonly y: number; readonly size?: PoffoWidget['size']},
  monitor: WallpaperMonitor,
) => {
  const scale = monitor.scale ?? 1
  const width = monitor.width ?? DESIGN_WIDTH
  const height = monitor.height ?? DESIGN_HEIGHT
  const widgetWidth = (widget.size?.width ?? DEFAULT_WIDGET.width) * scale
  const widgetHeight = (widget.size?.height ?? DEFAULT_WIDGET.height) * scale
  return {
    x: Math.round(
      (monitor.x ?? 0) +
        Math.max(0, Math.min(width - widgetWidth, widget.x * width - widgetWidth / 2)),
    ),
    y: Math.round(
      (monitor.y ?? 0) +
        Math.max(0, Math.min(height - widgetHeight, widget.y * height - widgetHeight / 2)),
    ),
  }
}
