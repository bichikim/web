import {useTranslations} from '../locale/use-translations'
import type {BoundedCache} from '../../shared/create-bounded-cache'
import {createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'
import {Compartment, EditorState, type Extension, StateEffect, Text} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {createEditorOffsets} from './create-editor-offsets'
import {createEditorSearchEffects} from './create-editor-search-effects'
import {createEditorExtensions} from './create-editor-extensions'
import type {CodeLocation, CodeToken} from '../../shared/contracts'
import type {TextMatch} from '../find-text'
import type {ViewRequest} from '../view-state/types'
import type {CodeSnippet, CodeTextRange, NavigationPoint} from '../types'
import {useEditorContextMenu} from './use-editor-context-menu'
import {SEditorContextMenu} from './SEditorContextMenu'
import {fileFormat} from '../../shared/file-formats'
import {useFileViewState} from '../view-state/context'
import {createEditorSelection} from './create-editor-selection'
import {connectEditorScroll} from './connect-editor-scroll'
import {useEditorAccessibility} from './use-editor-accessibility'

interface SCodeEditorProps {
  readonly source: string
  readonly location: CodeLocation
  readonly request?: ViewRequest
  readonly readOnly?: boolean
  readonly states?: Pick<BoundedCache<EditorState>, 'get' | 'set'>
  readonly fileKey?: string
  readonly matches?: readonly TextMatch[]
  readonly activeMatch?: number
  readonly searchScrollRequest?: number
  readonly onChange?: (source: string) => void
  readonly onSave?: () => void
  readonly onFollow?: (token: CodeToken, point?: NavigationPoint) => void
  readonly onSelect?: (range: CodeTextRange) => void
  readonly onShare?: (selection: CodeSnippet) => void
  readonly onFind?: (text?: string) => void
  readonly onError?: (error: unknown) => void
}
const EMPTY_MATCHES: readonly TextMatch[] = []
const DEFAULT_REQUEST: ViewRequest = {restore: false, version: 0}
const EMPTY_STATES: Pick<BoundedCache<EditorState>, 'get' | 'set'> = {
  get: () => undefined,
  set: () => undefined,
}

const documentText = (source: string): Text => Text.of(source.split(/\r\n|\r|\n/u))

const syntaxLanguageOf = (path: string): string | undefined => {
  const format = fileFormat(path)
  if (format?.kind === 'image' && format.mimeType === 'image/svg+xml') {
    return 'html'
  }
  return format?.kind === 'syntax' ? format.language : undefined
}

const locateEditor = (editor: EditorView, location: CodeLocation): void => {
  const line = editor.state.doc.line(Math.min(location.line, editor.state.doc.lines))
  const position = Math.min(line.to, line.from + location.column - 1)
  editor.dispatch({
    effects: EditorView.scrollIntoView(position, {y: 'center'}),
    selection: {anchor: position},
  })
}

export const SCodeEditor = (props: SCodeEditorProps) => {
  const t = useTranslations()
  const [container, setContainer] = createSignal<HTMLDivElement>()
  const [view, setView] = createSignal<EditorView>()
  const accessibility = useEditorAccessibility(view)
  const readOnly = (): boolean => props.readOnly !== false
  const states = () => props.states ?? EMPTY_STATES
  const fileKey = () => props.fileKey ?? props.location.path
  const fileView = useFileViewState()
  const menu = useEditorContextMenu({
    onError: (error) => props.onError?.(error),
    get onFind() {
      return props.onFind
    },
    get onShare() {
      return props.onShare
    },
    path: () => props.location.path,
    readOnly,
    view,
  })
  const sourceValue = createMemo(() => props.source)
  const offsets = createMemo(() => createEditorOffsets(sourceValue()))
  const matchesValue = createMemo(() =>
    (props.matches ?? EMPTY_MATCHES).map((match) => ({
      end: offsets().toEditor(match.end),
      start: offsets().toEditor(match.start),
    })),
  )
  const requestValue = createMemo(() => props.request ?? DEFAULT_REQUEST)
  const locationValue = createMemo(() => props.location)
  const syntaxLanguage = createMemo(() => syntaxLanguageOf(props.location.path))
  const marks = new Compartment()
  const editability = new Compartment()
  const separator = untrack(() => props.source.match(/\r\n|\r|\n/u)?.[0] ?? '\n')
  const writable = (): Extension[] => [
    EditorState.readOnly.of(readOnly()),
    EditorView.editable.of(!readOnly()),
  ]
  const extensions = (): Extension[] => [
    accessibility(),
    ...createEditorExtensions({
      editability,
      fileKey: fileKey(),
      foldLabel: (open) => t(open ? '접기' : '펼치기'),
      location: props.location,
      marks,
      onChange: (source) => props.onChange?.(source),
      get onFind() {
        return props.onFind
      },
      onFollow: (token, point) => props.onFollow?.(token, point),
      onSave: () => props.onSave?.(),
      onSelect: (range) => props.onSelect?.(range),
      readOffset: (position) => offsets().toSource(position),
      separator,
      states: states(),
      writable: writable(),
    }),
  ]
  onMount(() => {
    const key = fileKey()
    const cache = states()
    const cached = cache.get(key)
    const retained = requestValue().restore ? fileView?.read() : undefined
    const state =
      cached?.sliceDoc() === props.source
        ? cached.update({effects: StateEffect.reconfigure.of(extensions())}).state
        : EditorState.create({
            doc: documentText(props.source),
            extensions: extensions(),
            selection: createEditorSelection(documentText(props.source), retained?.selection),
          })
    const editor = new EditorView({parent: container(), state})
    if (!requestValue().restore || (cached === undefined && retained?.selection === undefined)) {
      locateEditor(editor, props.location)
    }
    setView(editor)
    editor.focus()
    const stopScroll = connectEditorScroll(editor, fileView, retained?.codeScroll)
    onCleanup(() => {
      if (editor !== undefined) {
        stopScroll()
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
      locateEditor(editor, location)
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
    const active = props.activeMatch ?? -1
    const request = props.searchScrollRequest ?? 0
    if (editor === undefined) {
      return
    }
    editor.dispatch({
      effects: createEditorSearchEffects({
        active,
        marks,
        matches,
        scroll: request > 0,
        state: editor.state,
      }),
    })
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
