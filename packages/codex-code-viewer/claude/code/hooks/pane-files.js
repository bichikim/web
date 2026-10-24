import {renderSearchField} from './pane-search-field.js'
import {paneButton} from './pane-control.js'
import {ROW_PIXELS} from './graphics.js'
import {treeGraphics} from './tree-graphics.js'
import {treeHoverGraphics} from './tree-hover-graphics.js'
import {paneGeometry} from './pane-geometry.ts'
import {paneHover} from './pane-hover.js'
const MIN_FILTER_COLUMNS = 8
const FILTER_INSET = 2
const fileIcon = (path) => {
  const extension = path.split('.').at(-1).toLowerCase()
  if (['ts', 'tsx', 'mts', 'cts'].includes(extension)) {
    return 'TS'
  }
  if (['js', 'jsx', 'mjs', 'cjs'].includes(extension)) {
    return 'JS'
  }
  if (extension === 'json') {
    return '{}'
  }
  if (['md', 'mdx'].includes(extension)) {
    return 'M↓'
  }
  return '▯'
}
/** Describes a bounded, filterable hierarchy and operations for its selected entry. */
export function renderFiles(view) {
  const {Box, Input, Button, Text, Client, Svg} = view.elements
  const button = (key, label, command, options) => paneButton(view, {command, key, label, options})
  const field = (key, label, name, value) =>
    Input({
      key,
      label: view.t(label),
      onInput: (value) => view.send({kind: 'field', name, value}),
      onSubmit: (value) => view.send({kind: 'field', name, value}),
      value,
    })
  const rows = view.nodes.slice(view.treeOffset, view.treeOffset + view.treeRows).map((node) => ({
    depth: node.path.split('/').length - 1,
    dirty: view.state.documents.some(
      (entry) => entry.path === node.path && entry.source !== entry.base,
    ),
    expanded: view.treeQuery !== '' || view.expanded.includes(node.path),
    icon: fileIcon(node.path),
    kind: node.kind,
    name: node.name,
    openable: node.kind === 'file' ? node.openable : true,
    path: node.path,
  }))
  const props = {
    active: view.state.active,
    columns: paneGeometry(view.bodyColumns, view.preferences).treeColumns,
    cursor: view.treeCursor,
    rows,
  }
  return [
    Box({
      children: [
        button(
          'new-file',
          '새 파일',
          {kind: 'entryDialog', value: 'file'},
          {columns: 4, icon: 'file-plus'},
        ),
        button(
          'new-folder',
          '새 폴더',
          {kind: 'entryDialog', value: 'directory'},
          {columns: 4, icon: 'folder-plus'},
        ),
        button('tree-refresh', '새로고침', {kind: 'treeRefresh'}, {columns: 4, icon: 'reload'}),
        Box({flexGrow: 1}),
        button('tree-reveal', '현재 파일 표시', {kind: 'treeReveal'}, {columns: 4, icon: 'target'}),
      ],
      flexWrap: 'nowrap',
      height: 2,
    }),
    Box({
      children: [
        renderSearchField(view, {
          change: {kind: 'treeFilter'},
          columns: Math.max(
            MIN_FILTER_COLUMNS,
            paneGeometry(view.bodyColumns, view.preferences).treeColumns - FILTER_INSET,
          ),
          key: 'tree-filter',
          placeholder: view.t('파일 필터링…'),
          submit: {kind: 'treeFilter'},
          value: view.treeQuery,
        }),
      ],
      paddingLeft: 1,
      paddingRight: 1,
    }),
    Box({
      children: [
        ...rows.map((row, index) =>
          Box({
            children: [
              Svg({
                alt: row.name,
                height: ROW_PIXELS,
                source: treeGraphics({
                  ...props,
                  highlight: paneHover().tree === row.path,
                  rows: [row],
                }),
              }),
              Box({
                children: [
                  Svg({alt: '', height: ROW_PIXELS, source: treeHoverGraphics(props.columns)}),
                ],
                display: 'none',
                height: 1,
                hover: {display: 'flex', scope: `tree-row:${index}`},
                left: 0,
                position: 'absolute',
                right: 0,
                top: 0,
              }),
            ],
            flexShrink: 0,
            height: 1,
            hover: {scope: `tree-row:${index}`},
            key: `tree-row:${row.path}`,
            overflow: 'hidden',
            position: 'relative',
          }),
        ),
        Box({
          children: [
            Client({
              height: Math.max(1, rows.length),
              key: 'file-tree:viewport',
              module: './tree-client.js',
              props,
              width: '100%',
            }),
          ],
          height: Math.max(1, rows.length),
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }),
      ],
      flexDirection: 'column',
      height: Math.max(1, rows.length),
      position: 'relative',
    }),
    ...(view.nodes.length === 0
      ? [
          Text({
            children: [view.t(view.treeQuery ? '일치하는 파일이 없습니다.' : '파일이 없습니다.')],
            dimColor: true,
          }),
        ]
      : []),
    ...(view.treeTruncated
      ? [
          Text({
            children: [view.t('파일 목록 제한에 도달했습니다. 경로로 열 수 있습니다.')],
            dimColor: true,
          }),
        ]
      : []),
  ]
}
