import {EditorState} from '@codemirror/state'
import {ensureSyntaxTree, syntaxTree} from '@codemirror/language'
import {classHighlighter, highlightCode} from '@lezer/highlight'
import {createEditorLanguage} from './editor/create-editor-language'
import type {SyntaxSpan} from './types'
const PARSE_BUDGET_MS = 40

/** Uses the editor's parsers and token classes for read-only comparison content. */
export const highlightCodeLines = (path: string, source: string): readonly SyntaxSpan[][] => {
  const state = EditorState.create({doc: source, extensions: [createEditorLanguage(path)]})
  const tree = ensureSyntaxTree(state, state.doc.length, PARSE_BUDGET_MS) ?? syntaxTree(state)
  const lines: SyntaxSpan[][] = [[]]
  let offset = 0
  highlightCode(
    source,
    tree,
    classHighlighter,
    (text, classes) => {
      lines[lines.length - 1].push({classes, offset, text})
      offset += text.length
    },
    () => {
      lines.push([])
      offset += 1
    },
  )
  return lines
}
