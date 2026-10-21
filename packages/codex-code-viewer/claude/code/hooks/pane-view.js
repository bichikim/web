import {beginControls} from './control-state.js'
import {renderNavigation} from './pane-navigation-control.js'
import {renderPath} from './pane-path.js'
import {paneButton} from './pane-control.js'
import {renderPopover} from './pane-popover.js'
import {renderFiles} from './pane-files.js'
import {renderDocument} from './pane-document.js'
import {renderSettings} from './pane-settings.js'
import {paneGeometry} from './pane-geometry.ts'
import {renderDivider} from './pane-divider.js'
const MAX_DISPLAY_CHARS = 10_000
function toolbar(view) {
  const {Box, Button, Input, Text} = view.elements
  const button = (key, label, command, options) => paneButton(view, {command, key, label, options})
  return [
    Box({
      alignItems: 'center',
      children: [
        renderNavigation(view),
        renderPath(view),
        button('search', '검색', {kind: 'search'}, {columns: 7, primary: true}),
        button(
          'files',
          '파일',
          {kind: 'tree'},
          {active: view.preferences.tree, columns: 4, icon: 'folder'},
        ),
        button(
          'settings',
          '설정',
          {kind: 'page', value: view.page === 'settings' ? 'document' : 'settings'},
          {columns: 4, icon: 'settings'},
        ),
        ...(view.state.attachments.length === 0
          ? []
          : [
              button(
                'attachments',
                view.t('첨부 {count}', {count: view.state.attachments.length}),
                {
                  kind: 'page',
                  value: view.page === 'attachments' ? 'document' : 'attachments',
                },
              ),
            ]),
      ],
      flexWrap: 'nowrap',
      height: 2,
      key: 'navigation-toolbar',
      width: '100%',
    }),
    ...(view.state.documents.some((entry) => entry.source !== entry.base)
      ? [
          Box({
            children: view.state.documents
              .filter((entry) => entry.source !== entry.base)
              .map((entry) =>
                button(`draft:${entry.path}`, `${entry.path.split('/').at(-1)} *`, {
                  kind: 'open',
                  location: {column: entry.column, line: entry.line, path: entry.path},
                }),
              ),
            flexWrap: 'wrap',
            key: 'draft-tabs',
          }),
        ]
      : []),
    ...view.paths.map((path) =>
      button(`file:${path}`, path, {kind: 'open', location: {column: 1, line: 1, path}}),
    ),
    ...(view.document === undefined
      ? [Text({children: [view.t('프로젝트 파일을 선택하세요.')], dimColor: true})]
      : []),
  ]
}
function attachments(view) {
  const {Box, Text, Code, Button} = view.elements
  const button = (key, label, command) =>
    Button({
      key,
      label: command.kind === 'open' ? label : view.t(label),
      onPress: () => view.send(command),
    })
  return Box({
    children: [
      Box({
        children: [
          Text({
            bold: true,
            children: [view.t('채팅 첨부 {count}', {count: view.state.attachments.length})],
          }),
          button('attachments-close', '닫기', {kind: 'page', value: 'document'}),
          button('attachments-clear', '모두 제거', {kind: 'clearAttachments'}),
        ],
        flexWrap: 'wrap',
      }),
      ...view.state.attachments.map((entry, index) =>
        Box({
          children: [
            button(`attachment-open:${index}`, `${entry.path}:${entry.start}-${entry.end}`, {
              kind: 'open',
              location: {column: 1, line: entry.start, path: entry.path},
            }),
            Code({path: entry.path, source: entry.text.slice(0, MAX_DISPLAY_CHARS)}),
            button(`remove-attachment:${index}`, '제거', {index, kind: 'removeAttachment'}),
          ],
          flexDirection: 'column',
        }),
      ),
    ],
    flexDirection: 'column',
  })
}
/** Describes the toolbar, persistent file sidebar, document and temporary drawers. */
export function renderPaneView(view) {
  const {Box, Button, Text} = view.elements
  beginControls(view)
  const {side, treeColumns} = paneGeometry(view.bodyColumns, view.preferences)
  const body = Box({
    alignItems: 'stretch',
    children: [
      ...(view.preferences.tree
        ? side
          ? [renderDivider(view, renderFiles(view))]
          : [
              Box({
                children: renderFiles(view),
                flexDirection: 'column',
                flexShrink: 0,
                key: 'file-sidebar',
                width: treeColumns,
              }),
            ]
        : []),
      Box({
        children: view.document === undefined ? [] : renderDocument(view),
        flexDirection: 'column',
        flexGrow: 1,
        height: '100%',
        key: 'document-pane',
        minHeight: 0,
        minWidth: 0,
      }),
    ],
    columnGap: 0,
    flexDirection: side ? 'row-reverse' : 'column',
    flexGrow: 1,
    key: 'workspace-body',
    minHeight: 0,
    overflow: 'hidden',
  })
  const workspace = Box({
    children: [
      ...toolbar(view),
      ...(view.page === 'settings'
        ? [renderSettings(view)]
        : view.page === 'attachments'
          ? [attachments(view)]
          : [body]),
      Box({
        alignItems: 'center',
        children: [
          Text({
            children: [
              view.document === undefined
                ? ''
                : [view.document.path, view.document.line, view.document.column].join(':') +
                  (view.document.source === view.document.base ? '' : ' *'),
            ],
            dimColor: true,
            wrap: 'truncate-middle',
          }),
          ...(view.state.attachments.length
            ? [
                Button({
                  key: 'attachments-footer',
                  label: view.t('첨부 {count}', {count: view.state.attachments.length}),
                  onPress: () => view.send({kind: 'page', value: 'attachments'}),
                }),
              ]
            : []),
          Text({children: [view.workspace.split('/').at(-1)], dimColor: true}),
        ],
        flexShrink: 0,
        justifyContent: 'space-between',
        key: 'workspace-footer',
      }),
      ...renderPopover(view),
    ],
    flexDirection: 'column',
    height: view.bodyRows,
    left: 0,
    position: 'absolute',
    right: 0,
    top: view.scrollOffset,
  })
  const sourceExtent = Math.max(
    0,
    (view.editor?.totalRows ?? 0) - (view.editor?.height ?? view.rowCount),
  )
  const treeExtent = view.preferences.tree ? Math.max(0, view.nodes.length - view.treeRows) : 0
  return Box({
    children: [workspace],
    height: view.bodyRows + sourceExtent + treeExtent,
    position: 'relative',
  })
}
