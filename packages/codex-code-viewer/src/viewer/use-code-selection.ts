import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {CodeDocument, ViewerSession} from '../shared/contracts'
import type {
  CodeSelection,
  CodeSnippet,
  CodeTextRange,
  ViewerPort,
  WorkspaceSelection,
} from './types'
import {formatSelection} from './format-selection'
import {addChatContext} from './add-chat-context'
import {relativeWorkspacePath} from './relative-workspace-path'

interface UseCodeSelectionProps {
  onError: (error: unknown) => void
  onNotice: (message: string) => void
  port: ViewerPort
  session: Accessor<ViewerSession | null>
  source?: Accessor<string | undefined>
  workspace?: Accessor<string | undefined>
}

const documentRows = (document: CodeDocument | undefined, source?: string): string[] =>
  source === undefined && document !== undefined && document.lines.length > 0
    ? document.lines.map((tokens) => tokens.map((token) => token.text).join(''))
    : (source ?? document?.source ?? '').split(/\r\n|\n|\r/u)

export const useCodeSelection = (props: UseCodeSelectionProps) => {
  const [selection, setSelection] = createSignal<CodeSelection | null>(null)
  const rows = createMemo(() => documentRows(props.session()?.document, props.source?.()))

  const address = createMemo(() => {
    const document = props.session()?.document
    if (document?.media !== undefined) {
      return document.location.path
    }
    const selected = selection()
    return selected === null ? '' : formatSelection(selected)
  })
  const reset = (document: CodeDocument, previous?: CodeSelection): void => {
    const selected = {...document.location, endLine: document.location.line}
    setSelection(previous ?? selected)
    if (previous !== undefined) {
      preserve(document)
    }
  }
  const preserve = (document: CodeDocument): void => {
    const previous = selection()
    if (previous === null || previous.path !== document.location.path) {
      reset(document)
      return
    }
    const draft = props.source?.()
    const rows = documentRows(document, draft)
    const last = Math.max(
      1,
      draft === undefined ? (document.lineCount ?? rows.length) : rows.length,
    )
    const selected = {
      ...previous,
      endLine: Math.min(last, previous.endLine),
      line: Math.min(last, previous.line),
    }
    if (selected.endColumn !== undefined) {
      selected.column = Math.min(selected.column, (rows[selected.line - 1]?.length ?? 0) + 1)
      selected.endColumn = Math.min(
        selected.endColumn,
        (rows[selected.endLine - 1]?.length ?? 0) + 1,
      )
      if (selected.line === selected.endLine) {
        selected.endColumn = Math.max(selected.column, selected.endColumn)
      }
    }
    setSelection(selected)
  }
  const selectLines = (anchor: number, focus: number = anchor): void => {
    const current = props.session()
    if (current === null || !Number.isInteger(anchor) || !Number.isInteger(focus)) {
      return
    }
    const draft = props.source?.()
    const last = Math.max(
      1,
      draft === undefined
        ? (current.document.lineCount ?? current.document.lines.length)
        : rows().length,
    )
    const selected = {
      ...current.document.location,
      column: 1,
      endLine: Math.max(1, Math.min(last, Math.max(anchor, focus))),
      line: Math.max(1, Math.min(last, Math.min(anchor, focus))),
    }
    setSelection(selected)
  }
  const selectText = (range: CodeTextRange): void => {
    const current = props.session()
    if (
      current === null ||
      ![range.line, range.column, range.endLine, range.endColumn].every(
        (value) => Number.isInteger(value) && value >= 1,
      )
    ) {
      return
    }
    const sourceRows = rows()
    const last = Math.max(1, sourceRows.length)
    const line = Math.min(last, range.line)
    const endLine = Math.max(line, Math.min(last, range.endLine))
    const column = Math.min((sourceRows[line - 1]?.length ?? 0) + 1, range.column)
    const endColumn = Math.min((sourceRows[endLine - 1]?.length ?? 0) + 1, range.endColumn)
    setSelection({
      ...current.document.location,
      column,
      endColumn: endLine === line ? Math.max(column, endColumn) : endColumn,
      endLine,
      line,
    })
  }
  const share = async (snapshot?: CodeSelection | CodeSnippet): Promise<void> => {
    const current = props.session()
    if (current?.document.media !== undefined && snapshot === undefined) {
      await sharePath({
        kind: 'file',
        path: `${current.workspace.replace(/\/$/u, '')}/${current.document.location.path}`,
      })
      return
    }
    const selected = snapshot ?? selection()
    if (current !== null && selected !== null && selected.path === current.document.location.path) {
      try {
        await addChatContext({
          message:
            'kind' in selected
              ? '선택한 코드를 다음 채팅 메시지에 추가했습니다.'
              : '선택한 파일과 줄 정보를 다음 채팅 메시지에 추가했습니다.',
          onNotice: props.onNotice,
          port: props.port,
          selection: selected,
        })
      } catch (error) {
        props.onError(error)
      }
    }
  }
  const sharePath = async (selected: WorkspaceSelection): Promise<void> => {
    const workspace = props.workspace?.() ?? props.session()?.workspace
    const path = workspace === undefined ? null : relativeWorkspacePath(workspace, selected.path)
    if (path === null) {
      return
    }
    try {
      await addChatContext({
        message:
          selected.kind === 'file'
            ? '파일을 다음 채팅 메시지에 추가했습니다.'
            : '폴더를 다음 채팅 메시지에 추가했습니다.',
        onNotice: props.onNotice,
        port: props.port,
        selection: {...selected, path: path === '' ? '.' : path},
      })
    } catch (error) {
      props.onError(error)
    }
  }
  return {
    address,
    clear: () => setSelection(null),
    preserve,
    reset,
    selection,
    selectLines,
    selectText,
    share,
    sharePath,
  }
}
