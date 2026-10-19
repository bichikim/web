import {formatContext, sourceOffset} from '../../../src/headless/index.ts'
const MAX_ATTACHMENTS = 20
const MAX_UNDO_STEPS = 32
const MAX_UNDO_BYTES = 524288
const boundedHistory = (values: readonly string[]): readonly string[] =>
  values
    .slice(-MAX_UNDO_STEPS)
    .reduceRight<{readonly entries: readonly string[]; readonly bytes: number}>(
      (retained, source) => {
        const bytes = retained.bytes + new TextEncoder().encode(source).length
        return bytes > MAX_UNDO_BYTES ? retained : {bytes, entries: [source, ...retained.entries]}
      },
      {bytes: 0, entries: []},
    ).entries
const MAX_ATTACHMENT_BYTES = 65_536
export interface PaneDocument {
  readonly path: string
  readonly revision: string
  readonly base: string
  readonly source: string
  readonly line: number
  readonly column: number
  readonly conflict: boolean
  readonly undo?: readonly string[]
  readonly redo?: readonly string[]
  readonly media?: {readonly kind: string; readonly mimeType: string; readonly size: number}
}
export interface PaneAttachment {
  readonly path: string
  readonly start: number
  readonly end: number
  readonly text: string
}
export interface PaneState {
  readonly active: string
  readonly documents: readonly PaneDocument[]
  readonly attachments: readonly PaneAttachment[]
}
export const emptyPane = (): PaneState => ({active: '', attachments: [], documents: []})

/** Removes cached files below a renamed, moved or deleted entry, retaining chat snapshots. */
export const removePaneEntry = (state: PaneState, path: string): PaneState => {
  const included = (candidate: string): boolean =>
    candidate === path || candidate.startsWith(`${path}/`)
  return {
    ...state,
    active: included(state.active) ? '' : state.active,
    documents: state.documents.filter((entry) => !included(entry.path)),
  }
}

/** Retains an edited document's original revision while following a new disk location. */
export const followDocument = (
  state: PaneState,
  disk: {
    readonly source: string
    readonly revision: string
    readonly media?: PaneDocument['media']
    readonly location: {readonly path: string; readonly line: number; readonly column: number}
  },
): PaneState => {
  const previous = state.documents.find((document) => document.path === disk.location.path)
  const dirty = previous !== undefined && previous.source !== previous.base
  const document: PaneDocument = {
    base: dirty ? previous.base : disk.source,
    redo: previous?.redo ?? [],
    undo: previous?.undo ?? [],
    ...(disk.media === undefined ? {} : {media: disk.media}),
    column: disk.location.column,
    conflict: dirty && previous.revision !== disk.revision,
    line: Math.min(disk.location.line, (dirty ? previous.source : disk.source).split('\n').length),
    path: disk.location.path,
    revision: dirty ? previous.revision : disk.revision,
    source: dirty ? previous.source : disk.source,
  }
  return {
    ...state,
    active: document.path,
    documents: [
      ...state.documents.filter(
        (entry) => entry.path !== document.path && entry.source !== entry.base,
      ),
      document,
    ],
  }
}

/** Replaces, inserts after, or removes one line without normalizing untouched line endings. */
export const changeLine = (
  document: PaneDocument,
  operation: 'replace' | 'insert' | 'remove',
  text = '',
): PaneDocument => {
  const lines = document.source.split('\n')
  const offset = document.line - 1
  const ending = lines[offset]?.endsWith('\r') ? '\r' : ''
  const source =
    operation === 'replace'
      ? [...lines.slice(0, offset), text + ending, ...lines.slice(offset + 1)].join('\n')
      : operation === 'insert'
        ? [...lines.slice(0, offset + 1), ending, ...lines.slice(offset + 1)].join('\n')
        : lines.filter((_, index) => index !== offset).join('\n')
  return {
    ...document,
    line: Math.min(
      operation === 'insert' ? document.line + 1 : document.line,
      source.split('\n').length,
    ),
    redo: [],
    source,
    undo: boundedHistory([...(document.undo ?? []), document.source]),
  }
}

/** Replaces an existing line while leaving identical input and missing files unchanged. */
export const replacePaneLine = (
  state: PaneState,
  path: string,
  line: number,
  text: string,
): PaneState => {
  const current = state.documents.find((entry) => entry.path === path)
  const previous = current?.source.split('\n')[line - 1]
  if (current === undefined || previous === undefined || previous.replace(/\r$/u, '') === text) {
    return state
  }
  const changed = changeLine({...current, line}, 'replace', text)
  return {
    ...state,
    documents: state.documents.map((entry) => (entry.path === path ? changed : entry)),
  }
}

/** Replaces the active draft text while retaining the last disk revision and undo baseline. */
export const replacePaneSource = (state: PaneState, source: string): PaneState => ({
  ...state,
  documents: state.documents.map((document) =>
    document.path !== state.active || document.source === source
      ? document
      : {
          ...document,
          line: Math.min(document.line, source.split('\n').length),
          redo: [],
          source,
          undo: boundedHistory([...(document.undo ?? []), document.source]),
        },
  ),
})

/** Captures a bounded, immutable range of the current source, including unsaved edits. */
export const attachRange = (
  state: PaneState,
  document: PaneDocument,
  end: number,
  columns?: {readonly start: number; readonly end: number},
): PaneState | undefined => {
  const lines = document.source.split('\n')
  if (
    !Number.isInteger(end) ||
    end < document.line ||
    end > lines.length ||
    state.attachments.length >= MAX_ATTACHMENTS
  ) {
    return undefined
  }
  if (
    columns !== undefined &&
    (!Number.isInteger(columns.start) ||
      !Number.isInteger(columns.end) ||
      columns.start < 1 ||
      columns.start > lines[document.line - 1].length + 1 ||
      columns.end < 1 ||
      columns.end > lines[end - 1].length + 1 ||
      (end === document.line && columns.end <= columns.start))
  ) {
    return undefined
  }
  const text = formatContext({
    column: columns?.start ?? 1,
    ...(columns === undefined ? {} : {endColumn: columns.end}),
    endLine: end,
    kind: 'code',
    line: document.line,
    path: document.path,
    text:
      columns === undefined
        ? lines.slice(document.line - 1, end).join('\n')
        : document.source.slice(
            sourceOffset(document.source, document.line, columns.start),
            sourceOffset(document.source, end, columns.end),
          ),
  })
  const attachments = [...state.attachments, {end, path: document.path, start: document.line, text}]
  if (
    new TextEncoder().encode(attachments.map((entry) => entry.text).join('\n')).length >
    MAX_ATTACHMENT_BYTES
  ) {
    return undefined
  }
  return {...state, attachments}
}

/** Captures the active document range described by the native selection fields. */
export const attachPaneSelection = (
  state: PaneState,
  endLine: string,
  startColumn: string,
  endColumn: string,
): PaneState | undefined => {
  const document = state.documents.find((entry) => entry.path === state.active)
  if (document === undefined) {
    return undefined
  }
  const end = Number(endLine || document.line)
  const columns =
    startColumn === '' && endColumn === ''
      ? undefined
      : {
          end: Number(endColumn || (document.source.split('\n')[end - 1]?.length ?? -1) + 1),
          start: Number(startColumn || 1),
        }
  return attachRange(state, document, end, columns)
}

/** Validates persisted, session-scoped drafts before any are restored. */
export const restorePane = (value: unknown): PaneState | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const state = value as Partial<PaneState>
  if (
    typeof state.active !== 'string' ||
    !Array.isArray(state.documents) ||
    !Array.isArray(state.attachments)
  ) {
    return undefined
  }
  if (
    !state.documents.every(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.path === 'string' &&
        typeof entry.revision === 'string' &&
        typeof entry.base === 'string' &&
        typeof entry.source === 'string' &&
        Number.isInteger(entry.line) &&
        entry.line > 0 &&
        entry.line <= entry.source.split('\n').length &&
        Number.isInteger(entry.column) &&
        entry.column > 0 &&
        typeof entry.conflict === 'boolean' &&
        (entry.undo === undefined ||
          (Array.isArray(entry.undo) &&
            entry.undo.every((source: unknown) => typeof source === 'string'))) &&
        (entry.redo === undefined ||
          (Array.isArray(entry.redo) &&
            entry.redo.every((source: unknown) => typeof source === 'string'))),
    )
  ) {
    return undefined
  }
  if (
    !state.attachments.every(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.path === 'string' &&
        typeof entry.text === 'string' &&
        Number.isInteger(entry.start) &&
        Number.isInteger(entry.end) &&
        entry.start > 0 &&
        entry.end >= entry.start,
    )
  ) {
    return undefined
  }
  if (
    (state.active !== '' && !state.documents.some((entry) => entry.path === state.active)) ||
    new Set(state.documents.map((entry) => entry.path)).size !== state.documents.length ||
    state.attachments.length > MAX_ATTACHMENTS ||
    new TextEncoder().encode(state.attachments.map((entry) => entry.text).join('\n')).length >
      MAX_ATTACHMENT_BYTES
  ) {
    return undefined
  }
  return state as PaneState
}

/** Restores the previous draft text while retaining its disk revision. */
export const undoEdit = (document: PaneDocument): PaneDocument => {
  const source = document.undo?.at(-1)
  return source === undefined
    ? document
    : {
        ...document,
        line: Math.min(document.line, source.split('\n').length),
        redo: boundedHistory([...(document.redo ?? []), document.source]),
        source,
        undo: document.undo?.slice(0, -1),
      }
}

/** Reapplies the next draft text while retaining its disk revision. */
export const redoEdit = (document: PaneDocument): PaneDocument => {
  const source = document.redo?.at(-1)
  return source === undefined
    ? document
    : {
        ...document,
        line: Math.min(document.line, source.split('\n').length),
        redo: document.redo?.slice(0, -1),
        source,
        undo: boundedHistory([...(document.undo ?? []), document.source]),
      }
}
