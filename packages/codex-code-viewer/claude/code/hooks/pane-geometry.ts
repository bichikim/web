import type {PanePreferences} from './pane-preferences'
import {paneSidebarWidth} from './pane-sidebar-width'
import {COLUMN_PIXELS, DIVIDER_COLUMNS} from './pane-metrics'
import {SIDEBAR_LAYOUT} from '../../../src/headless/sidebar-layout'
const SIDEBAR_COLUMNS = 80
const MIN_CODE_COLUMNS = SIDEBAR_LAYOUT.contentMinimum / COLUMN_PIXELS
const CONTROL_ROWS = 8
const AUTO_ROWS = 24
interface PaneRowsInput {
  readonly bodyRows: number
  readonly hasDrafts: boolean
  readonly preferences: PanePreferences
  readonly side?: boolean
}
/** Reserves native controls and shares a stacked viewport between the source and tree. */
export const paneRows = ({
  bodyRows,
  hasDrafts,
  preferences,
  side = preferences.layout !== 'above',
}: PaneRowsInput): number => {
  const available = Math.max(2, bodyRows - CONTROL_ROWS - Number(hasDrafts) * 2)
  const visible = preferences.tree && !side ? Math.floor(available / 2) : available
  return Math.max(1, Math.min(visible, preferences.rows === AUTO_ROWS ? visible : preferences.rows))
}
/** Shares the source/tree cell geometry across layout, painting and input routing. */
export const paneGeometry = (columns: number, preferences: PanePreferences) => {
  const side =
    preferences.layout === 'side' || (preferences.layout === 'auto' && columns >= SIDEBAR_COLUMNS)
  const treeColumns = preferences.tree
    ? side
      ? paneSidebarWidth(columns, preferences.treeWidth) / COLUMN_PIXELS
      : columns
    : 0
  return {
    codeColumns: Math.max(
      MIN_CODE_COLUMNS,
      side && preferences.tree ? columns - treeColumns - DIVIDER_COLUMNS : columns,
    ),
    side,
    treeColumns,
    treeStart: columns - treeColumns,
  }
}
