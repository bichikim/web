import {SIDEBAR_LAYOUT} from '../../../src/headless/sidebar-layout'
import {sidebarWidth} from '../../../src/headless/sidebar-width'
import {COLUMN_PIXELS, DIVIDER_COLUMNS} from './pane-metrics'
import type {PanePreferences} from './pane-preferences'
const PERCENT = 100
/** Resolves stored pixel or legacy percentage widths against the shared Codex bounds. */
export const paneSidebarWidth = (
  columns: number,
  value: PanePreferences['treeWidth'] | number,
): number => {
  const available = columns * COLUMN_PIXELS
  const preferred =
    typeof value === 'number'
      ? value
      : Number.parseFloat(value) * (value.endsWith('%') ? available / PERCENT : 1)
  return sidebarWidth({
    ...SIDEBAR_LAYOUT,
    available,
    preferred,
    spacing: DIVIDER_COLUMNS * COLUMN_PIXELS,
  }).width
}
