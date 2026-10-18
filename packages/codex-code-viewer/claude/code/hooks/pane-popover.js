import {paneButton} from './pane-control.js'
import {COLUMN_PIXELS, ROW_PIXELS, svgDocument, svgElement} from './graphics.js'
import {paneGeometry} from './pane-geometry.ts'
let current
const REFERENCE_WIDTH = 60
const MENU_WIDTH = 34
const MIN_WIDTH = 12
const PAGE_ROWS = 5
const DIALOG_ROWS = 8
const CODE_ORIGIN = 4
const TREE_ORIGIN = 7
const collapsed = new Set()
let offset = 0
let pageRows = PAGE_ROWS
export const panePopover = () => current
export function closePopover() {
  current = undefined
  offset = 0
}
export function showPopover(value) {
  current = value
  offset = 0
  collapsed.clear()
}
export function changePopover(command) {
  if (command.kind === 'popoverClose') {
    closePopover()
    return true
  }
  if (command.kind === 'referenceGroup') {
    collapsed.has(command.path) ? collapsed.delete(command.path) : collapsed.add(command.path)
    offset = 0
    return true
  }
  return false
}
export function referenceRows(locations) {
  return [
    ...Map.groupBy(
      locations.map((location, index) => ({index, location})),
      (entry) => entry.location.path,
    ),
  ].flatMap(([path, entries]) => [
    {count: entries.length, expanded: !collapsed.has(path), kind: 'group', path},
    ...(collapsed.has(path) ? [] : entries.map((entry) => ({...entry, kind: 'location'}))),
  ])
}
export function scrollPopover(by, rows = pageRows) {
  if (current?.kind !== 'references') {
    return
  }
  const {length} = referenceRows(current.locations)
  offset = Math.max(0, Math.min(Math.max(0, length - rows), offset + by))
}
const previewLines = (location, preferences) =>
  (location.preview ?? '').split('\n').slice(0, preferences.previewLines)
const referenceHeight = (row, preferences) =>
  row.kind === 'group' ? 1 : previewLines(row.location, preferences).length
const menuItems = (view) => {
  if (current.kind === 'code') {
    return [
      ['context-copy', '코드 복사', {kind: 'copyCode'}],
      ['context-attach', '채팅창에 추가', {kind: 'attach'}],
      ['context-find', '파일 내 검색  ⌘/Ctrl F', {kind: 'tools', value: 'find'}],
      ['context-definition', '정의·사용처  F12', {kind: 'navigate', navigation: 'definition'}],
    ]
  }
  if (current.kind === 'document') {
    return [
      ['find-tools', '문서 내 검색', {kind: 'tools', value: 'find'}],
      ['selection-tools', '선택·첨부', {kind: 'tools', value: 'selection'}],
      ['jump-tools', '줄로 이동', {kind: 'tools', value: 'location'}],
      ['document-copy', '코드 복사', {kind: 'copyCode'}],
      ['document-undo', '실행 취소', {kind: 'undo'}],
      ['document-redo', '다시 실행', {kind: 'redo'}],
    ]
  }
  return [
    ['copy-entry', '복사  ⌘/Ctrl C', {action: 'copy', kind: 'capture'}],
    ['cut-entry', '잘라내기  ⌘/Ctrl X', {action: 'cut', kind: 'capture'}],
    ...(view.clipboard ? [['paste-entry', '붙여넣기  ⌘/Ctrl V', {kind: 'paste'}]] : []),
    ['attach-entry', '채팅창에 추가', {kind: 'attachEntry'}],
    ['copy-path', '경로 복사', {kind: 'copyPath'}],
    ['rename-entry', '이름 변경', {kind: 'entryDialog', value: 'rename'}],
    ['remove-entry', '삭제', {kind: 'remove'}],
  ]
}
function contents(view, visible) {
  const {Box, Button, Text, Input} = view.elements
  const button = (key, label, command, options = {}) =>
    paneButton(view, {
      command,
      key,
      label,
      options: {
        columns:
          Math.min(
            current.kind === 'references' ? REFERENCE_WIDTH : MENU_WIDTH,
            view.bodyColumns - 2,
          ) - 2,
        row: true,
        rows: 1,
        ...options,
      },
    })
  if (current.kind === 'dialog') {
    return [
      Text({
        bold: true,
        children: [
          current.action === 'rename'
            ? '이름 변경'
            : current.action === 'directory'
              ? '새 폴더'
              : '새 파일',
        ],
      }),
      Input({
        autoFocus: true,
        key: 'entry-name',
        label: view.t('이름'),
        onInput: (value) => view.send({kind: 'field', name: 'entryName', value}),
        onSubmit: (name) =>
          view.send(
            current.action === 'rename'
              ? {dismiss: true, kind: 'rename', name}
              : {dismiss: true, entryKind: current.action, kind: 'create', name},
          ),
        value: view.entryName,
      }),
      button(
        current.action === 'rename'
          ? 'rename-confirm'
          : current.action === 'directory'
            ? 'create-folder'
            : 'create-file',
        current.action === 'rename' ? '변경' : '만들기',
        current.action === 'rename'
          ? {dismiss: true, kind: 'rename'}
          : {dismiss: true, entryKind: current.action, kind: 'create'},
      ),
    ]
  }
  if (current.kind !== 'references') {
    return menuItems(view).map(([key, label, command], index) =>
      button(key, label, {...command, dismiss: true}, {focus: index === 0}),
    )
  }
  const rows = referenceRows(current.locations)
  const title = view.t(current.navigation === 'definition' ? '정의 위치' : '사용처')
  const count = view.t('{count}개', {count: current.locations.length})
  return [
    Box({
      children: [
        Text({
          bold: true,
          children: [
            current.status === 'loading' ? view.t('위치 확인 중…') : `${title} · ${count}`,
          ],
        }),
        Button({
          key: 'popover-close',
          label: '×',
          onPress: () => view.send({kind: 'popoverClose'}),
          plain: true,
        }),
      ],
      height: 2,
      justifyContent: 'space-between',
    }),
    ...(current.status === 'failed'
      ? [Text({children: [view.t('검색을 완료하지 못했습니다.')]})]
      : []),
    ...rows.slice(offset, offset + visible).map((row, index) =>
      row.kind === 'group'
        ? button(
            `reference-group:${row.path}`,
            `${row.expanded ? '⌄' : '›'} ${row.path} · ${row.count}`,
            {kind: 'referenceGroup', path: row.path},
            {focus: index === 0},
          )
        : button(
            `location:${row.index}`,
            `${row.location.line}:${row.location.column}  ${
              row.location.preview
                ?.split('\n')
                .slice(0, view.preferences.previewLines)
                .join('  ') ?? ''
            }`,
            {dismiss: true, kind: 'open', location: row.location},
            {
              lines: [
                `${row.location.line}:${row.location.column}  ${row.location.preview?.split('\n')[0] ?? ''}`,
                ...(row.location.preview?.split('\n').slice(1, view.preferences.previewLines) ??
                  []),
              ],
              mono: true,
              rows: referenceHeight(row, view.preferences),
            },
          ),
    ),
    ...(rows.length > visible
      ? [
          Box({
            children: [
              Button({
                key: 'reference-previous',
                label: '↑',
                onPress: () => view.send({by: -visible, kind: 'referenceScroll'}),
                plain: true,
              }),
              Text({
                children: [
                  `${Math.min(offset + 1, rows.length)}–${Math.min(offset + visible, rows.length)} / ${rows.length}`,
                ],
                dimColor: true,
              }),
              Button({
                key: 'reference-next',
                label: '↓',
                onPress: () => view.send({by: visible, kind: 'referenceScroll'}),
                plain: true,
              }),
            ],
            height: 2,
            justifyContent: 'space-between',
          }),
        ]
      : []),
  ]
}
/** Places transient actions after workspace content without shifting the document. */
export function renderPopover(view) {
  if (current === undefined) {
    return []
  }
  const {Box, Client, Svg} = view.elements
  const width = Math.min(
    current.kind === 'references' ? REFERENCE_WIDTH : MENU_WIDTH,
    Math.max(MIN_WIDTH, view.bodyColumns - 2),
  )
  const visible = Math.max(
    1,
    Math.min(PAGE_ROWS, Math.floor((view.bodyRows - DIALOG_ROWS) / view.preferences.previewLines)),
  )
  pageRows = visible
  const height = Math.min(
    view.bodyRows - 2,
    current.kind === 'references'
      ? TREE_ORIGIN +
          referenceRows(current.locations)
            .slice(offset, offset + visible)
            .reduce((sum, row) => sum + referenceHeight(row, view.preferences), 0)
      : current.kind === 'dialog'
        ? DIALOG_ROWS
        : 2 + menuItems(view).length,
  )
  const geometry = paneGeometry(view.bodyColumns, view.preferences)
  const point = current.point ?? {x: 2, y: 0}
  const origin = current.region === 'tree' ? geometry.treeStart : 0
  const left = Math.max(
    1,
    Math.min(
      view.bodyColumns - width - 1,
      origin + (Number.isFinite(point.x) ? Math.floor(point.x) : 2),
    ),
  )
  const top = Math.max(
    2,
    Math.min(
      view.bodyRows - height - 1,
      (Number.isFinite(point.y) ? Math.floor(point.y) : 0) +
        (current.region === 'tree' ? TREE_ORIGIN : CODE_ORIGIN),
    ),
  )
  return [
    Box({
      children: [
        Client({
          height: view.bodyRows,
          key: 'popover-backdrop',
          module: './popover-client.js',
          props: {},
          width: '100%',
        }),
      ],
      height: view.bodyRows,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    }),
    Box({
      children: [
        Svg({
          alt: current.kind === 'references' ? '사용처 팝업' : '작업 메뉴',
          height: height * ROW_PIXELS,
          source: svgDocument({
            content: svgElement('rect', {
              class: 'fill-canvas stroke-divider',
              height: height * ROW_PIXELS - 2,
              rx: 12,
              width: width * COLUMN_PIXELS - 2,
              x: 1,
              y: 1,
            }),
            font: 'sans',
            height: height * ROW_PIXELS,
            width: width * COLUMN_PIXELS,
          }),
        }),
        Box({
          children: contents(view, visible),
          flexDirection: 'column',
          height,
          left: 0,
          overflow: 'hidden',
          paddingX: 1,
          paddingY: 1,
          position: 'absolute',
          right: 0,
          top: 0,
        }),
      ],
      height,
      key: 'pane-popover',
      left,
      position: 'absolute',
      top,
      width,
    }),
  ]
}
export function handlePopoverFocus(engine, event) {
  const popover = panePopover()
  if (
    popover !== undefined &&
    popover.kind !== 'dialog' &&
    event.element === undefined &&
    event.origin.kind === 'person'
  ) {
    closePopover()
    engine.ui.invalidate('ui.render')
  }
}
