import {DIVIDER_COLUMNS} from './pane-metrics.ts'
import styles from 'viewer-graphics-styles'
const palette = {
  accent: styles.match(/--viewer-accent:\s*(?<color>[^;]+)/u)?.groups?.color ?? 'blue',
  divider: styles.match(/--viewer-border:\s*(?<color>[^;]+)/u)?.groups?.color ?? 'gray',
}
/** Keeps the tree on the intrinsic client width while Desktop defers server redraws during capture. */
export function renderDivider(view, tree) {
  const {Box, Client} = view.elements
  const rows = Math.max(1, view.bodyRows - 2)
  return Box({
    children: [
      Box({
        children: [
          Client({
            height: rows,
            // Replace the prior Client so Desktop loads local-only motion on plugin reload.
            key: 'panel-divider:local-width',
            module: './sidebar-resize-client.js',
            props: {columns: view.bodyColumns, palette, rows, value: view.preferences.treeWidth},
          }),
        ],
        position: 'relative',
      }),
      Box({
        children: tree,
        flexDirection: 'column',
        height: rows,
        key: 'file-sidebar',
        left: DIVIDER_COLUMNS,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        top: 0,
      }),
    ],
    flexShrink: 0,
    key: 'workspace-divider',
    position: 'relative',
  })
}
