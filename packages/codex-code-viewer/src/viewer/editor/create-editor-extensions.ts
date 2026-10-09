import type {BoundedCache} from '../../shared/create-bounded-cache'
import {Compartment, EditorState, type Extension} from '@codemirror/state'
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands'
import {bracketMatching, indentOnInput, syntaxHighlighting} from '@codemirror/language'
import {classHighlighter} from '@lezer/highlight'
import type {CodeToken} from '../../shared/contracts'
import type {CodeTextRange} from '../types'
import {createEditorNavigation} from './create-editor-navigation'
import {createEditorLanguage} from './create-editor-language'
interface EditorExtensionsOptions {
  readonly separator: string
  readonly location: {readonly path: string}
  readonly writable: Extension
  readonly editability: Compartment
  readonly marks: Compartment
  readonly onChange: (source: string) => void
  readonly onSave: () => void
  readonly onFollow: (token: CodeToken) => void
  readonly onSelect: (range: CodeTextRange) => void
  readonly onFind?: (text?: string) => void
  readonly states: Pick<BoundedCache<EditorState>, 'get' | 'set'>
  readonly fileKey: string
}
export const createEditorExtensions = (options: EditorExtensionsOptions): Extension[] => [
  EditorState.lineSeparator.of(options.separator),
  EditorState.tabSize.of(2),
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  highlightSpecialChars(),
  drawSelection(),
  history(),
  indentOnInput(),
  bracketMatching(),
  createEditorLanguage(options.location.path),
  createEditorNavigation({onFollow: options.onFollow, path: options.location.path}),
  syntaxHighlighting(classHighlighter),
  options.editability.of(options.writable),
  options.marks.of(EditorView.decorations.of(Decoration.none)),
  EditorView.contentAttributes.of({
    'aria-label': '코드 편집기',
    'aria-multiline': 'true',
    role: 'textbox',
    spellcheck: 'false',
  }),
  EditorView.updateListener.of((update) => {
    options.states.set(options.fileKey, update.state)
    if (update.docChanged) {
      options.onChange(update.state.sliceDoc())
    }
    if (update.docChanged || update.selectionSet) {
      const selected = update.state.selection.main
      const start = update.state.doc.lineAt(selected.from)
      const end = update.state.doc.lineAt(selected.to)
      options.onSelect({
        column: selected.from - start.from + 1,
        endColumn: selected.to - end.from + 1,
        endLine: end.number,
        line: start.number,
      })
    }
  }),
  keymap.of([
    ...['Ctrl-f', 'Meta-f'].map((key) => ({
      key,
      run: (view: EditorView) => {
        const {onFind} = options
        if (onFind === undefined) {
          return false
        }
        const selected = view.state.selection.main
        onFind(view.state.sliceDoc(selected.from, selected.to))
        return true
      },
    })),
    {
      key: 'Mod-s',
      run: () => {
        options.onSave()
        return true
      },
    },
    indentWithTab,
    ...historyKeymap,
    ...defaultKeymap,
  ]),
]
