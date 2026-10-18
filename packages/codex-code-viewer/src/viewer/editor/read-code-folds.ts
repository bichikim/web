import {EditorState} from '@codemirror/state'
import {ensureSyntaxTree, foldable, foldService} from '@codemirror/language'
import {fileFormat} from '../../shared/file-formats'
import {createEditorLanguage} from './create-editor-language'
import {indentFoldRange} from './indent-fold-range'

const PARSE_BUDGET = 10

/** Reads fold headers and the last fully hidden line without changing source offsets. */
export function* readCodeFolds(
  path: string,
  source: string,
): Generator<ReadonlyMap<number, number> | null> {
  const format = fileFormat(path)
  if (
    format?.kind !== 'code' &&
    format?.kind !== 'syntax' &&
    !(format?.kind === 'image' && format.mimeType === 'image/svg+xml')
  ) {
    yield new Map()
    return
  }
  let state = EditorState.create({
    doc: source.split(/\r\n|\r|\n/u).join('\n'),
    extensions: [
      createEditorLanguage(path),
      foldService.of((value, start, end) => indentFoldRange(value, start, end, path)),
    ],
  })
  while (ensureSyntaxTree(state, state.doc.length, PARSE_BUDGET) === null) {
    const {state: next} = state.update({})
    state = next
    yield null
  }
  const {state: parsed} = state.update({})
  state = parsed
  const ranges = new Map<number, number>()
  for (let number = 1; number <= state.doc.lines; number += 1) {
    const line = state.doc.line(number)
    const range = foldable(state, line.from, line.to)
    if (range !== null) {
      const end = state.doc.lineAt(range.to)
      const last = end.number - (range.to < end.to ? 1 : 0)
      if (last > number) {
        ranges.set(number, last)
      }
    }
  }
  yield ranges
}
