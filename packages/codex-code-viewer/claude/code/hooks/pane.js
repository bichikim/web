import {focusField} from './control-state.js'
import {paneTranslate} from './pane-translate.ts'
import {receivePaneMessage} from './pane-messages.js'
import {changeMedia, mediaView, openMedia} from './pane-media.js'
import {createPopoverActions} from './pane-popover-actions.js'
import {
  changePopover,
  closePopover,
  panePopover,
  scrollPopover,
  showPopover,
} from './pane-popover.js'
import {findPaneMatch, movePaneLine, navigatePane} from './pane-navigation.js'
import {changeField, fields} from './pane-fields.js'
import {createDocumentActions} from './pane-document-actions.js'
import {changeTable, openTable, tableView} from './pane-table.js'
/* eslint-disable id-length -- Claude Mods validates the literal $ API parameter. */
import {
  buildFileTree,
  fileFormat,
  formatContext,
  getVisibleNodes,
  isEditableFile,
  parseFileInput,
  sourceOffset,
} from '../../../src/headless/index.ts'
import {
  attachPaneSelection,
  emptyPane,
  followDocument,
  redoEdit,
  removePaneEntry,
  replacePaneSource,
  restorePane,
  undoEdit,
} from './pane-state.ts'
import {appendAttachment, draftAttachment} from './pane-attachments.ts'
import {loadEditorTokens} from './load-editor-tokens.js'
import {requestPane} from './request-pane.js'
import {createEntryActions} from './pane-entry-actions.js'
import {renderPaneView} from './pane-view.js'
import {editorProps, editorScrollOffset, resetEditor, scrollEditor} from './pane-editor.js'
import {paneGeometry, paneRows} from './pane-geometry.ts'
import {defaultPreferences, restorePreferences} from './pane-preferences.ts'
import {runPaneAction as run} from './pane-actions.js'
const MAX_SEARCH_RESULTS = 40
let treeRows = 24
let bodyColumns = 100
let state = emptyPane()
let connection
let storageKey
let paths = []
let visits = []
let visitIndex = -1
let page = 'document'
let tree = []
const expanded = new Set()
let treeOffset = 0
let findIndex = -1
let viewMode = 'source'
let draftPatch = ''
let rowCount = defaultPreferences().rows
let clipboard
let preferences = defaultPreferences()
let treeCursor = ''
let scrollRegion = 'code'
let treeQuery = ''
let treeTruncated = false
let tools = ''
let treeReady = false
async function persistPreferences($) {
  if (storageKey !== undefined) {
    await $.store.set(`${storageKey}:view`, preferences)
  }
  $.ui.invalidate('ui.render')
}
async function persist($) {
  if (storageKey !== undefined) {
    await $.store.set(storageKey, state)
  }
  $.ui.invalidate('ui.render')
}
function clipboardCall($, name, args) {
  if (!connection?.clipboard) {
    throw new Error('클립보드 연결이 활성화되지 않았습니다.')
  }
  return call($, name, args)
}
function call($, name, args) {
  return requestPane($, connection, name, args)
}
async function open($, location, existing) {
  const {document} = await call($, 'code.open', location)
  if (
    typeof document?.source !== 'string' ||
    typeof document?.revision !== 'string' ||
    typeof document?.location?.path !== 'string'
  ) {
    throw new Error('텍스트 파일을 열 수 없습니다.')
  }
  state = followDocument(state, document)
  treeCursor = state.active
  fields.entryPath = document.location.path
  fields.folder = fields.entryPath.split('/').slice(0, -1).join('/')
  if (existing === undefined) {
    visits = [...visits.slice(0, visitIndex + 1), {...document.location}]
    visitIndex = visits.length - 1
  } else {
    visitIndex = existing
  }
  page = 'document'
  resetEditor(await $.clock.now())
  await loadEditorTokens($, connection, selected())
  findIndex = -1
  paths = []
  closePopover()
  viewMode = 'preview'
  viewMode = (await openMedia((name, args) => call($, name, args), selected()))
    ? 'preview'
    : 'source'
  tools = ''
  fields.startColumn = ''
  fields.endColumn = ''
  fields.endLine = String(selected().line)
  await persist($)
}
function update(document) {
  state = {
    ...state,
    documents: state.documents.map((entry) => (entry.path === document.path ? document : entry)),
  }
}
function selected() {
  return state.documents.find((document) => document.path === state.active)
}
export async function connectPane($, location) {
  const address = new URL(location.url)
  connection = {
    clipboard: location.capabilities?.clipboard === true,
    origin: address.origin,
    session: location.session,
    token: new URLSearchParams(address.hash.slice(1)).get('token'),
  }
  storageKey = `pane:${location.workspace}:${await $.session.id()}`
  const stored = await $.store.get(storageKey)
  preferences = restorePreferences(await $.store.get(`${storageKey}:view`))
  if (stored !== undefined) {
    const restored = restorePane(stored)
    if (restored === undefined) {
      storageKey = undefined
      throw new Error('저장된 초안을 읽을 수 없습니다. 덮어쓰지 않았습니다.')
    }
    state = restored
  }
  $.ui.invalidate('ui.render')
  if (state.active !== '') {
    await run($, () => open($, {column: 1, line: selected()?.line ?? 1, path: state.active}))
  }
  if (preferences.tree) {
    await run($, () => loadTree($))
  }
}
export function followPane($, location) {
  return connection === undefined || !preferences.follow
    ? Promise.resolve()
    : run($, () => open($, location))
}
export function paneAttachments() {
  return state.attachments.map((entry) => entry.text)
}
export function handlePaneMessage($, event) {
  return receivePaneMessage($, event, {
    dispatch: (command) => dispatchPane($, command),
    editor: {
      command: (kind, point) =>
        ['find', 'location'].includes(kind)
          ? ((tools = kind), persist($))
          : ['definition', 'path'].includes(kind)
            ? navigateCode($, kind, point)
            : dispatchPane($, kind === 'context' ? {kind: 'codeMenu', point} : {kind}),
      copy: (text) => clipboardCall($, 'code.copy', {path: selected().path, text}),
      document: selected,
      editable: () => viewMode === 'edit',
      highlight: () => loadEditorTokens($, connection, selected()),
      paste: async () => {
        const result = await clipboardCall($, 'code.paste', {path: selected().path})
        return result.text
      },
      persist: () => persist($),
      replace: (source) => {
        state = replacePaneSource(state, source)
      },
      selection: (range) => {
        update({...selected(), column: range.column, line: range.line})
        fields.endLine = String(range.endLine)
        fields.startColumn = range.empty ? '' : String(range.column)
        fields.endColumn = range.empty ? '' : String(range.endColumn)
      },
    },
    execute: (action) => run($, action),
    region: (value) => {
      scrollRegion = value
    },
    resize: (value, commit) => {
      preferences = {...preferences, treeWidth: value}
      $.ui.invalidate('ui.render')
      return commit ? persistPreferences($) : Promise.resolve()
    },
    tree: () => ({
      nodes: getVisibleNodes(tree, expanded.has.bind(expanded), treeQuery),
      offset: treeOffset,
      rows: treeRows,
    }),
  })
}
async function searchFiles($, value) {
  fields.query = value
  const result = await call($, 'code.list', {query: fields.query})
  paths = result.paths.slice(0, MAX_SEARCH_RESULTS)
  page = 'document'
  $.ui.invalidate('ui.render')
}
async function submitPath($, value) {
  const parsed = parseFileInput(
    /^[^/]+\.[\w-]+(?::\d+(?::\d+)?)?$/u.test(value) ? `./${value}` : value,
  )
  if (parsed.kind === 'path') {
    await open($, parsed.location)
  } else {
    await searchFiles($, parsed.query)
  }
}
async function loadTree($) {
  const result = await call($, 'code.tree', {})
  tree = buildFileTree(result.files, result.directories ?? [])
  treeTruncated = result.truncated === true
  treeReady = true
  treeOffset = 0
  $.ui.invalidate('ui.render')
}
async function moveLine($, line, column = 1) {
  update(movePaneLine(selected(), line, column))
  resetEditor()
  fields.endLine = String(line)
  await persist($)
}
async function findInDocument($, direction) {
  const found = findPaneMatch(selected().source, fields.findQuery, findIndex, direction)
  findIndex = found?.index ?? -1
  if (found === undefined) {
    $.ui.toast('검색 결과가 없습니다.')
    return
  }
  await moveLine($, found.line, found.column)
}
function navigateCode($, navigation, point) {
  return navigatePane($, navigation, {
    document: selected(),
    documents: state.documents,
    open: (location) => open($, location),
    point,
    request: (name, args) => call($, name, args),
  })
}
async function attachPatch($) {
  const result = draftAttachment(selected())
  if (result === undefined) {
    return
  }
  state = appendAttachment(state, result.attachment)
  draftPatch = result.patch
  viewMode = 'diff'
  await persist($)
}
async function attachEntry($) {
  const entry = await call($, 'code.entry', {path: fields.entryPath})
  state = appendAttachment(state, {
    end: 1,
    path: entry.path,
    start: 1,
    text: formatContext({kind: entry.kind, path: entry.path}),
  })
  await persist($)
}
function revealFile() {
  treeQuery = ''
  const parts = state.active.split('/')
  parts.slice(0, -1).forEach((_, index) => expanded.add(parts.slice(0, index + 1).join('/')))
  const index = getVisibleNodes(tree, expanded.has.bind(expanded), treeQuery).findIndex(
    (node) => node.path === state.active,
  )
  treeOffset = index < 0 ? 0 : Math.floor(index / treeRows) * treeRows
}
async function refreshFiles($) {
  await persist($)
  await loadTree($)
}
async function applyEntry($, original, path, action) {
  const current = selected()
  const included = (candidate) => candidate === original || candidate.startsWith(`${original}/`)
  if (action !== 'copy') {
    state = removePaneEntry(state, original)
    visits = visits.filter((entry) => !included(entry.path))
    visitIndex = Math.min(visitIndex, visits.length - 1)
  }
  fields.entryPath = path
  await refreshFiles($)
  if (current !== undefined && included(current.path) && action !== 'delete' && action !== 'copy') {
    await open($, {
      column: current.column,
      line: current.line,
      path: path + current.path.slice(original.length),
    })
  }
}
async function changeMode($, value) {
  const current = selected()
  if (value === 'preview' && fileFormat(current.path)?.kind === 'table') {
    await openTable((name, args) => call($, name, args), current)
  }
  if (value === 'preview' && ['image', 'word', 'spreadsheet'].includes(current.media?.kind)) {
    await openMedia((name, args) => call($, name, args), current)
  }
  viewMode = value
  $.ui.invalidate('ui.render')
}
function appearanceCommands($, command) {
  return {
    follow: () => {
      preferences = {...preferences, follow: !preferences.follow}
      return persistPreferences($)
    },
    preference: () => {
      preferences = restorePreferences({...preferences, [command.name]: command.value})
      rowCount = preferences.rows
      return persistPreferences($)
    },
    tools: () => {
      if (command.value === 'more') {
        showPopover({kind: 'document'})
        $.ui.invalidate('ui.render')
        return
      }
      tools = tools === command.value ? '' : command.value
      $.ui.invalidate('ui.render')
    },
    tree: async () => {
      preferences = {...preferences, tree: !preferences.tree}
      if (preferences.tree && !treeReady) {
        await loadTree($)
      }
      return persistPreferences($)
    },
    treeCollapse: () => {
      expanded.clear()
      treeQuery = ''
      treeOffset = 0
      $.ui.invalidate('ui.render')
    },
    treeFilter: () => {
      treeQuery = command.value
      treeOffset = 0
      $.ui.invalidate('ui.render')
    },
    treeRefresh: () => loadTree($),
    treeReveal: () => {
      revealFile()
      $.ui.invalidate('ui.render')
    },
  }
}
async function dispatchPane($, command) {
  if (command.dismiss) {
    closePopover()
    $.ui.invalidate('ui.render')
  }
  if (changePopover(command)) {
    $.ui.invalidate('ui.render')
    return
  }
  if (changeTable(command) || (await changeMedia(command, (name, args) => call($, name, args)))) {
    $.ui.invalidate('ui.render')
    return
  }
  const documents = createDocumentActions({
    get: () => state,
    persist: () => persist($),
    request: (name, args) => call($, name, args),
    reset: () => {
      tools = ''
      resetEditor()
    },
    set: (next) => {
      state = next
    },
  })
  const entries = createEntryActions($, {
    capture: (value) => {
      clipboard = value
    },
    changed: (original, path, action) => applyEntry($, original, path, action),
    clipboard: () => clipboard,
    documents: () => state.documents,
    open: (path) => open($, {column: 1, line: 1, path}),
    refresh: () => refreshFiles($),
    request: (name, args) => call($, name, args),
    selection: () => ({
      name: command.name ?? fields.entryName,
      parent: fields.folder,
      path: fields.entryPath,
    }),
  })
  const handlers = {
    ...appearanceCommands($, command),
    ...createPopoverActions($, command, {
      copy: (args) => clipboardCall($, 'code.copy', args),
      dispatch: (action) => dispatchPane($, action),
      document: selected,
    }),
    attach: () => {
      const next = attachPaneSelection(state, fields.endLine, fields.startColumn, fields.endColumn)
      if (next === undefined) {
        throw new Error('첨부 범위 또는 용량을 확인하세요.')
      }
      state = next
      return persist($)
    },
    attachEntry: () => attachEntry($),
    capture: () => entries.capture(command.action),
    clearAttachments: () => {
      state = {...state, attachments: []}
      return persist($)
    },
    create: () => entries.create(command.entryKind),
    discard: () => {
      tools = 'discard'
      $.ui.invalidate('ui.render')
    },
    discardConfirmed: () => documents.discard(),
    field: () => {
      changeField(command)
      if (command.name === 'findQuery') {
        findIndex = -1
      }
    },
    find: () => {
      if (command.value !== undefined) {
        fields.findQuery = command.value
        findIndex = -1
      }
      return findInDocument($, command.direction)
    },
    focusPath: () => focusField($, 'path'),
    folder: () => {
      treeCursor = command.path
      fields.entryPath = command.path
      fields.folder = command.path
      expanded.has(command.path) ? expanded.delete(command.path) : expanded.add(command.path)
      $.ui.invalidate('ui.render')
    },
    line: () => moveLine($, command.line, command.column),
    mode: () => changeMode($, command.value),
    navigate: () => navigateCode($, command.navigation),
    open: () => open($, command.location, command.existing),
    page: () => {
      page = command.value
      $.ui.invalidate('ui.render')
    },
    paste: () => entries.paste(),
    patch: () => attachPatch($),
    path: () => submitPath($, command.value),
    redo: () => {
      resetEditor()
      update(redoEdit(selected()))
      return persist($)
    },
    refresh: () => {
      const current = selected()
      return open($, {column: current.column, line: current.line, path: current.path}, visitIndex)
    },
    remove: () => entries.remove(),
    removeAttachment: () => {
      state = {
        ...state,
        attachments: state.attachments.filter((_, index) => index !== command.index),
      }
      return persist($)
    },
    rename: () => entries.rename(),
    save: () => documents.save(),
    search: () => searchFiles($, fields.query),
    treeFocus: () => {
      treeCursor = command.path
      treeOffset = command.offset
      $.ui.invalidate('ui.render')
    },
    undo: () => {
      resetEditor()
      update(undoEdit(selected()))
      return persist($)
    },
  }
  const handler = handlers[command.kind]
  if (handler === undefined) {
    throw new Error('Unknown Pane command')
  }
  return handler()
}
/** Renders the native surface from a captured model and declarative user commands. */
export function renderPane($, event) {
  const current = selected()
  ;({bodyColumns} = event.props)
  preferences = restorePreferences(preferences, bodyColumns)
  rowCount = paneRows({
    bodyRows: event.props.scroll.bodyRows,
    hasDrafts: state.documents.some((entry) => entry.source !== entry.base),
    preferences,
    side: paneGeometry(bodyColumns, preferences).side,
  })
  treeRows = rowCount
  return renderPaneView({
    bodyColumns: event.props.bodyColumns,
    bodyRows: event.props.scroll.bodyRows,
    clipboard: clipboard !== undefined,
    clipboardPath: clipboard?.path,
    document: current,
    draftPatch,
    editor:
      current === undefined
        ? undefined
        : editorProps(
            current,
            rowCount,
            paneGeometry(bodyColumns, preferences).codeColumns,
            preferences,
          ),
    elements: $.ui.resolve(event),
    endColumn: fields.endColumn,
    endLine: fields.endLine,
    entryName: fields.entryName,
    entryPath: fields.entryPath,
    expanded: [...expanded],
    findIndex,
    findQuery: fields.findQuery,
    folder: fields.folder,
    nodes: getVisibleNodes(tree, expanded.has.bind(expanded), treeQuery),
    page,
    paths,
    preferences,
    query: fields.query,
    rowCount,
    scrollOffset: event.props.scroll.offset,
    send: (command) =>
      changePopover(command)
        ? ($.ui.invalidate('ui.render'), Promise.resolve())
        : run($, () => dispatchPane($, command)),
    startColumn: fields.startColumn,
    state,
    ...tableView(),
    ...mediaView(current),
    t: (message, values) => paneTranslate(preferences.language, message, values),
    tools,
    treeCursor,
    treeOffset,
    treeQuery,
    treeRows,
    treeTruncated,
    viewMode,
    visitIndex,
    visits,
    workspace: storageKey?.split(':')[1] ?? '',
  })
}

/** Scrolls the code or tree viewport while retaining the toolbar and footer. */
export function scrollPane($, event) {
  return run($, async () => {
    const {side, treeStart} = paneGeometry(bodyColumns, preferences)
    if (panePopover()?.kind === 'references') {
      scrollPopover(event.by)
      $.ui.invalidate('ui.render')
      return event.offset
    }
    if (
      preferences.tree &&
      (side && event.pointer !== undefined
        ? event.pointer.column >= treeStart
        : scrollRegion === 'tree')
    ) {
      const count = getVisibleNodes(tree, expanded.has.bind(expanded), treeQuery).length
      treeOffset = Math.max(0, Math.min(Math.max(0, count - treeRows), treeOffset + event.by))
    } else {
      scrollEditor(event.by)
    }
    $.ui.invalidate('ui.render')
    return treeOffset + editorScrollOffset()
  })
}
