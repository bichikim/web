import type {BoundedCache} from '../../shared/create-bounded-cache'
import {createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'
import {Compartment, EditorState, type Extension, StateEffect, Text} from '@codemirror/state'
import {Decoration, EditorView} from '@codemirror/view'
import {createEditorExtensions} from './create-editor-extensions'
import type {CodeLocation, CodeToken} from '../../shared/contracts'
import type {TextMatch} from '../find-text'
import type {ViewRequest} from '../view-state/types'
import type {CodeSnippet, CodeTextRange, NavigationPoint} from '../types'
import {useEditorContextMenu} from './use-editor-context-menu'
import {SEditorContextMenu} from './SEditorContextMenu'
import {fileFormat} from '../../shared/file-formats'

interface SCodeEditorProps {
  readonly source: string
  readonly location: CodeLocation
  readonly request: ViewRequest
  readonly readOnly: boolean
  readonly states: Pick<BoundedCache<EditorState>, 'get' | 'set'>
  readonly fileKey: string
  readonly matches: readonly TextMatch[]
  readonly activeMatch: number
  readonly searchScrollRequest: number
  readonly onChange: (source: string) => void
  readonly onSave: () => void
  readonly onFollow: (token: CodeToken, point?: NavigationPoint) => void
  readonly onSelect: (range: CodeTextRange) => void
  readonly onShare?: (selection: CodeSnippet) => void
  readonly onFind?: (text?: string) => void
  readonly onError?: (error: unknown) => void
}
const documentText = (source: string): Text => Text.of(source.split(/\r\n|\r|\n/u))
const positionOf = (source: string, offset: number): number =>
  source.slice(0, offset).replace(/\r\n|\r/gu, '\n').length

export const SCodeEditor = (props: SCodeEditorProps) => {
  const [container, setContainer] = createSignal<HTMLDivElement>()
  const [view, setView] = createSignal<EditorView>()
  const menu = useEditorContextMenu({
    onError: (error) => props.onError?.(error),
    get onFind() {
      return props.onFind
    },
    get onShare() {
      return props.onShare
    },
    path: () => props.location.path,
    readOnly: () => props.readOnly,
    view,
  })
  const sourceValue = createMemo(() => props.source)
  const matchesValue = createMemo(() => props.matches)
  const requestValue = createMemo(() => props.request)
  const locationValue = createMemo(() => props.location)
  const syntaxLanguage = createMemo(() => {
    const format = fileFormat(props.location.path)
    return format?.kind === 'syntax' ? format.language : undefined
  })
  const marks = new Compartment()
  const editability = new Compartment()
  const separator = untrack(() => props.source.match(/\r\n|\r|\n/u)?.[0] ?? '\n')
  const writable = (): Extension[] => [
    EditorState.readOnly.of(props.readOnly),
    EditorView.editable.of(!props.readOnly),
  ]
  const extensions = (): Extension[] =>
    createEditorExtensions({
      editability,
      fileKey: props.fileKey,
      location: props.location,
      marks,
      onChange: (source) => props.onChange(source),
      get onFind() {
        return props.onFind
      },
      onFollow: (token, point) => props.onFollow(token, point),
      onSave: () => props.onSave(),
      onSelect: (range) => props.onSelect(range),
      separator,
      states: props.states,
      writable: writable(),
    })
  onMount(() => {
    const key = props.fileKey
    const cache = props.states
    const cached = cache.get(key)
    const state =
      cached?.sliceDoc() === props.source
        ? cached.update({effects: StateEffect.reconfigure.of(extensions())}).state
        : EditorState.create({doc: documentText(props.source), extensions: extensions()})
    const editor = new EditorView({parent: container(), state})
    if (!props.request.restore || cached === undefined) {
      const line = state.doc.line(Math.min(props.location.line, state.doc.lines))
      const position = Math.min(line.to, line.from + props.location.column - 1)
      editor.dispatch({
        effects: EditorView.scrollIntoView(position, {y: 'center'}),
        selection: {anchor: position},
      })
    }
    setView(editor)
    editor.focus()
    onCleanup(() => {
      if (editor !== undefined) {
        cache.set(key, editor.state)
        editor.destroy()
      }
    })
  })
  createEffect(() => {
    const editor = view()
    const request = requestValue()
    const location = locationValue()
    if (editor !== undefined && !request.restore) {
      const line = editor.state.doc.line(Math.min(location.line, editor.state.doc.lines))
      const position = Math.min(line.to, line.from + location.column - 1)
      editor.dispatch({
        effects: EditorView.scrollIntoView(position, {y: 'center'}),
        selection: {anchor: position},
      })
    }
  })
  createEffect(() => {
    const editor = view()
    const source = sourceValue()
    if (editor === undefined) {
      return
    }
    if (editor.state.sliceDoc() !== source) {
      editor.setState(
        EditorState.create({doc: documentText(source), extensions: untrack(extensions)}),
      )
    }
  })
  createEffect(() => {
    const editor = view()
    const extensions = writable()
    editor?.dispatch({effects: editability.reconfigure(extensions)})
  })
  createEffect(() => {
    const editor = view()
    const matches = matchesValue()
    const active = props.activeMatch
    const request = props.searchScrollRequest
    if (editor === undefined) {
      return
    }
    const source = editor.state.sliceDoc()
    const ranges = matches.map((match, index) =>
      Decoration.mark({class: index === active ? 'cm-search-active' : 'cm-search-match'}).range(
        positionOf(source, match.start),
        positionOf(source, match.end),
      ),
    )
    editor.dispatch({
      effects: marks.reconfigure(EditorView.decorations.of(Decoration.set(ranges, true))),
    })
    const match = matches[active]
    if (match !== undefined && request > 0) {
      editor.dispatch({
        effects: EditorView.scrollIntoView(positionOf(source, match.start), {y: 'center'}),
      })
    }
  })
  return (
    <>
      <div
        ref={setContainer}
        class="ui-code-editor"
        data-language={syntaxLanguage()}
        onContextMenu={menu.handleContextMenu}
        onKeyDown={menu.handleKeyboard}
      />
      <Show when={menu.context()} keyed>
        {(context) => <SEditorContextMenu {...context} onClose={menu.close} />}
      </Show>
    </>
  )
}
