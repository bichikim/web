import {SIDEBAR_LAYOUT} from '../../../src/headless/sidebar-layout'
import {paneSidebarWidth} from './pane-sidebar-width'
const COMPACT_ROWS = 12
const DEFAULT_ROWS = 24
const EXPANDED_ROWS = 48
const DEFAULT_PREVIEW_LINES = 2
const MAX_PREVIEW_LINES = 5
export interface PanePreferences {
  readonly follow: boolean
  readonly language: 'ko' | 'en'
  readonly tree: boolean
  readonly layout: 'auto' | 'side' | 'above'
  readonly rows: typeof COMPACT_ROWS | typeof DEFAULT_ROWS | typeof EXPANDED_ROWS
  readonly wrap: 'wrap' | 'truncate-end'
  readonly numbers: boolean
  readonly previewLines: number
  readonly treeWidth: `${number}%` | `${number}px`
}
export const defaultPreferences = (): PanePreferences => ({
  follow: true,
  language: 'ko',
  layout: 'side',
  numbers: true,
  previewLines: DEFAULT_PREVIEW_LINES,
  rows: DEFAULT_ROWS,
  tree: true,
  treeWidth: `${SIDEBAR_LAYOUT.initial}px`,
  wrap: 'wrap',
})
const MIN_WIDTH = 20
const MAX_WIDTH = 80
const MAX_PIXEL_WIDTH = 16_384
export const isTreeWidth = (value: unknown): value is PanePreferences['treeWidth'] =>
  typeof value === 'string' &&
  ((/^\d{2}%$/u.test(value) &&
    Number.parseInt(value, 10) >= MIN_WIDTH &&
    Number.parseInt(value, 10) <= MAX_WIDTH) ||
    (/^\d{3,5}px$/u.test(value) &&
      Number.parseInt(value, 10) >= SIDEBAR_LAYOUT.minimum &&
      Number.parseInt(value, 10) <= MAX_PIXEL_WIDTH))
/** Restores recognized display choices while retaining defaults for older settings. */
export const restorePreferences = (value: unknown, columns?: number): PanePreferences => {
  const defaults = defaultPreferences()
  if (typeof value !== 'object' || value === null) {
    return defaults
  }
  const fields = value as Partial<PanePreferences>
  const treeWidth = isTreeWidth(fields.treeWidth) ? fields.treeWidth : defaults.treeWidth
  return {
    follow: typeof fields.follow === 'boolean' ? fields.follow : defaults.follow,
    language: fields.language === 'en' ? 'en' : defaults.language,
    layout:
      fields.layout === 'auto' || fields.layout === 'side' || fields.layout === 'above'
        ? fields.layout
        : defaults.layout,
    numbers: typeof fields.numbers === 'boolean' ? fields.numbers : defaults.numbers,
    previewLines:
      typeof fields.previewLines === 'number' &&
      Number.isInteger(fields.previewLines) &&
      fields.previewLines >= 1 &&
      fields.previewLines <= MAX_PREVIEW_LINES
        ? fields.previewLines
        : defaults.previewLines,
    rows:
      fields.rows === COMPACT_ROWS || fields.rows === EXPANDED_ROWS ? fields.rows : defaults.rows,
    tree: typeof fields.tree === 'boolean' ? fields.tree : defaults.tree,
    treeWidth:
      columns !== undefined && treeWidth.endsWith('%')
        ? `${paneSidebarWidth(columns, treeWidth)}px`
        : treeWidth,
    wrap: fields.wrap === 'truncate-end' ? fields.wrap : defaults.wrap,
  }
}
