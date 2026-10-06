import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {CodeDocument, ViewerSession} from '../shared/contracts'
import type {CodeSelection, CodeTextRange, ViewerPort} from './types'
import {formatSelection} from './format-selection'

interface CodeSelectionOptions {
  onError: (error: unknown) => void
  onNotice: (message: string) => void
  port: ViewerPort
  session: Accessor<ViewerSession | null>
}

export const useCodeSelection = (options: CodeSelectionOptions) => {
  const [selection, setSelection] = createSignal<CodeSelection | null>(null)
  const address = createMemo(() => {
    const selected = selection()
    return selected === null ? '' : formatSelection(selected)
  })
  const reset = (document: CodeDocument): void => {
    const selected = {...document.location, endLine: document.location.line}
    setSelection(selected)
  }
  const preserve = (document: CodeDocument): void => {
    const previous = selection()
    if (previous === null || previous.path !== document.location.path) {
      reset(document)
      return
    }
    const last = Math.max(1, document.lines.length)
    const selected = {
      ...previous,
      endLine: Math.min(last, previous.endLine),
      line: Math.min(last, previous.line),
    }
    if (selected.endColumn !== undefined) {
      const rows = document.lines.map((tokens) => tokens.map((token) => token.text).join(''))
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
    const current = options.session()
    if (current === null || !Number.isInteger(anchor) || !Number.isInteger(focus)) {
      return
    }
    const last = Math.max(1, current.document.lines.length)
    const selected = {
      ...current.document.location,
      column: 1,
      endLine: Math.max(1, Math.min(last, Math.max(anchor, focus))),
      line: Math.max(1, Math.min(last, Math.min(anchor, focus))),
    }
    setSelection(selected)
  }
  const selectText = (range: CodeTextRange): void => {
    const current = options.session()
    if (
      current === null ||
      ![range.line, range.column, range.endLine, range.endColumn].every(
        (value) => Number.isInteger(value) && value >= 1,
      )
    ) {
      return
    }
    const rows = current.document.lines.map((tokens) => tokens.map((token) => token.text).join(''))
    const last = Math.max(1, rows.length)
    const line = Math.min(last, range.line)
    const endLine = Math.max(line, Math.min(last, range.endLine))
    const column = Math.min((rows[line - 1]?.length ?? 0) + 1, range.column)
    const endColumn = Math.min((rows[endLine - 1]?.length ?? 0) + 1, range.endColumn)
    setSelection({
      ...current.document.location,
      column,
      endColumn: endLine === line ? Math.max(column, endColumn) : endColumn,
      endLine,
      line,
    })
  }
  const share = async (snapshot?: CodeSelection): Promise<void> => {
    const current = options.session()
    const selected = snapshot ?? selection()
    if (current !== null && selected !== null && selected.path === current.document.location.path) {
      try {
        await options.port.context({...selected, path: `${current.workspace}/${selected.path}`})
        options.onNotice('선택한 파일과 줄 정보를 다음 채팅 메시지에 추가했습니다.')
      } catch (error) {
        options.onError(error)
      }
    }
  }
  return {address, preserve, reset, selection, selectLines, selectText, share}
}
