import {renderTable} from './pane-table-view.js'
import {renderMedia} from './pane-media.js'
import {renderHorizontal} from './pane-horizontal.js'
import {paneButton} from './pane-control.js'
import {fileFormat, findText, isEditableFile} from '../../../src/headless/index.ts'
import {ROW_PIXELS} from './graphics.js'
import {editorGraphics} from './editor-graphics.js'
const MAX_DISPLAY_CHARS = 10_000
const clean = (source) =>
  // eslint-disable-next-line no-control-regex -- Native Code permits tab and newline only.
  source.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/gu, '').slice(0, MAX_DISPLAY_CHARS)

function toolbar(view) {
  const {Box} = view.elements
  const {document} = view
  const button = (key, label, command, options) =>
    paneButton(view, {command, key, label, options: {document: true, ...options}})
  const editable = isEditableFile(document.path)
  const preview =
    ['markdown', 'table'].includes(fileFormat(document.path)?.kind) ||
    ['image', 'word', 'spreadsheet', 'pdf'].includes(document.media?.kind)
  const dirty = document.source !== document.base
  return Box({
    children: [
      ...(preview
        ? [
            button('preview', '미리보기', {kind: 'mode', value: 'preview'}),
            button('source', '원문', {kind: 'mode', value: 'source'}),
          ]
        : []),
      ...(dirty
        ? [
            button('save', '저장', {kind: 'save'}),
            button(
              'edit-more',
              '편집 더 보기',
              {kind: 'tools', value: 'edit'},
              {columns: 4, icon: 'dots'},
            ),
          ]
        : []),
      ...(editable
        ? [
            button(
              'edit',
              view.viewMode === 'edit' ? '편집 마침' : '편집',
              {
                kind: 'mode',
                value: view.viewMode === 'edit' ? 'source' : 'edit',
              },
              {columns: 9, icon: view.viewMode === 'edit' ? 'check' : 'pencil', showLabel: true},
            ),
          ]
        : []),
      button('document-more', '⋯', {kind: 'tools', value: 'more'}, {columns: 4, icon: 'dots'}),
      ...(view.editor.anchor === view.editor.head
        ? []
        : [button('attach-selection', '채팅에 추가', {kind: 'attach'})]),
    ],
    flexShrink: 0,
    flexWrap: 'nowrap',
    height: 2,
    justifyContent: 'flex-end',
    key: 'document-toolbar',
  })
}
function sourceBody(view) {
  const {Box, Code, Markdown, Svg, Text, Client} = view.elements
  const {document} = view
  const format = fileFormat(document.path)
  if (view.mediaPreview?.status === 'loading') {
    return [Text({children: [view.t('불러오는 중…')]})]
  }
  if (view.viewMode === 'preview') {
    if (view.mediaPreview !== undefined) {
      return renderMedia(view)
    }
    if (format?.kind === 'markdown') {
      return [Markdown({text: document.source.slice(0, MAX_DISPLAY_CHARS)})]
    }
    if (format?.kind === 'table' && view.tablePreview !== undefined) {
      return renderTable(view)
    }
    if (document.media?.mimeType === 'image/svg+xml') {
      return [Svg({alt: document.path, source: document.source})]
    }
  }
  if (view.viewMode === 'diff' && view.draftPatch !== '') {
    return [Code({format: 'diff', source: clean(view.draftPatch)})]
  }
  if (document.media !== undefined && document.source === '') {
    return [
      Text({
        children: [
          view.t('{kind} · 아직 Pane 미리보기를 지원하지 않습니다.', {kind: document.media.kind}),
        ],
      }),
    ]
  }
  const paint = {
    ...view.editor,
    editable: view.viewMode === 'edit' && isEditableFile(document.path),
    numbers: view.preferences.numbers,
    rows: view.editor.height,
    wrap: view.preferences.wrap,
  }
  const props = {
    ...paint,
    lines: paint.lines.map(({tokens, segments: _segments, ...line}) => ({
      ...line,
      links: tokens
        .filter((token) => token.navigation !== null)
        .map((token) => ({
          from: token.offset,
          to: token.offset + token.text.length,
        })),
    })),
    viewportRows: view.rowCount,
  }
  return [
    Box({
      children: [
        Box({
          children: [
            Svg({
              alt: `소스 코드 ${document.path}`,
              height: paint.rows * ROW_PIXELS,
              key: 'source-paint',
              source: editorGraphics(paint),
            }),
          ],
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }),
        Box({
          bottom: 0,
          children: [
            Client({
              height: view.rowCount,
              key: 'code-editor',
              module: './source-input-client.js',
              props,
              width: '100%',
            }),
          ],
          key: 'source-input',
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }),
      ],
      flexGrow: 1,
      height: view.rowCount,
      key: 'source-body',
      minHeight: 0,
      overflow: 'hidden',
      position: 'relative',
    }),
  ]
}
function navigation(view) {
  const {Box, Input, Button, Text} = view.elements
  const {document} = view
  const button = (key, label, command) =>
    Button({key, label: view.t(label), onPress: () => view.send(command)})
  const field = (key, label, name, value) =>
    Input({
      key,
      label: view.t(label),
      onInput: (value) => view.send({kind: 'field', name, value}),
      onSubmit: (value) => view.send({kind: 'field', name, value}),
      value,
    })
  const lines = document.source.split('\n')
  const find =
    view.tools === 'find'
      ? [
          Input({
            key: 'find',
            label: view.t('문서 내 검색'),
            onInput: (value) => view.send({kind: 'field', name: 'findQuery', value}),
            onSubmit: (value) => view.send({direction: 1, kind: 'find', value}),
            value: view.findQuery,
          }),
          Box({
            children: [
              button('find-previous', '이전', {direction: -1, kind: 'find'}),
              Text({
                children: [
                  `${view.findIndex < 0 ? 0 : view.findIndex + 1}/${findText(document.source, view.findQuery).length}`,
                ],
              }),
              button('find-next', '다음', {direction: 1, kind: 'find'}),
              button('find-close', '검색 닫기', {kind: 'tools', value: 'find'}),
            ],
            flexWrap: 'wrap',
          }),
        ]
      : []
  const location =
    view.tools === 'location' || view.tools === 'selection'
      ? [
          Box({
            children: [
              Input({
                key: 'line',
                label: view.t('시작 줄'),
                onSubmit: (value) => view.send({kind: 'line', line: Number(value)}),
                value: String(document.line),
              }),
              Input({
                key: 'column',
                label: view.t('열'),
                onSubmit: (value) =>
                  view.send({column: Number(value), kind: 'line', line: document.line}),
                value: String(document.column),
              }),
            ],
            flexWrap: 'wrap',
          }),
          Box({
            children: [
              button('definition', '정의·사용처', {kind: 'navigate', navigation: 'definition'}),
              button('import', 'import 경로', {kind: 'navigate', navigation: 'path'}),
            ],
            flexWrap: 'wrap',
          }),
        ]
      : []
  const selection =
    view.tools === 'selection'
      ? [
          field('attachment-end', '끝 줄', 'endLine', view.endLine || String(document.line)),
          Box({
            children: [
              field('selection-column', '시작 열', 'startColumn', view.startColumn),
              field('selection-end-column', '끝 열 (제외)', 'endColumn', view.endColumn),
            ],
            flexWrap: 'wrap',
          }),
          button('attach', '선택 범위 채팅에 추가', {kind: 'attach'}),
        ]
      : []
  const edit =
    view.tools === 'edit'
      ? [
          Box({
            children: [
              ...(view.document.undo?.length ? [button('undo', '실행 취소', {kind: 'undo'})] : []),
              ...(view.document.redo?.length ? [button('redo', '다시 실행', {kind: 'redo'})] : []),
              button('attach-changes', '변경 내용 채팅에 추가', {kind: 'patch'}),
              button('discard', '변경 버리기', {kind: 'discard'}),
            ],
            flexWrap: 'wrap',
          }),
        ]
      : []
  return [
    ...find,
    ...location,
    ...selection,
    ...edit,
    ...(view.tools === 'discard'
      ? [
          Box({
            children: [
              Text({children: [view.t('미저장 변경을 버릴까요?')]}),
              button('discard-cancel', '취소', {kind: 'tools', value: 'discard'}),
              button('discard-confirm', '변경 버리기', {kind: 'discardConfirmed'}),
            ],
            flexWrap: 'wrap',
          }),
        ]
      : []),
  ]
}
/** Describes the document toolbar and a source viewport with contextual drawers. */
export function renderDocument(view) {
  const {Text} = view.elements
  return [
    ...(view.document.conflict ? [Text({children: [view.t('디스크 변경 · 초안 유지')]})] : []),
    toolbar(view),
    ...navigation(view),
    ...sourceBody(view),
    ...renderHorizontal(view),
  ]
}
