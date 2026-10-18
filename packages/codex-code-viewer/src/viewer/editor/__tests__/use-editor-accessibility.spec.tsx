/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal, onCleanup} from 'solid-js'
import {afterEach, describe, expect, it} from 'vitest'
import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {LocaleContext} from '../../locale/context'
import type {ViewerLanguage} from '../../locale/types'
import {useEditorAccessibility} from '../use-editor-accessibility'

afterEach(cleanup)
describe('useEditorAccessibility', () => {
  it('should retain the current language when an external source replaces the editor state', () => {
    const [language, setLanguage] = createSignal<ViewerLanguage>('ko')
    const hook = renderHook(
      () => {
        const [view, setView] = createSignal<EditorView>()
        const accessibility = useEditorAccessibility(view)
        const editor = new EditorView({
          state: EditorState.create({doc: 'first', extensions: [accessibility()]}),
        })
        setView(editor)
        onCleanup(() => editor.destroy())
        return {accessibility, editor}
      },
      {
        wrapper: (props) => (
          <LocaleContext.Provider value={language}>{props.children}</LocaleContext.Provider>
        ),
      },
    )
    const {editor, accessibility} = hook.result
    setLanguage('en')
    expect(editor.contentDOM.getAttribute('aria-label')).toBe('Code editor')
    editor.setState(EditorState.create({doc: 'external change', extensions: [accessibility()]}))
    expect(editor.contentDOM.getAttribute('aria-label')).toBe('Code editor')
  })
})
