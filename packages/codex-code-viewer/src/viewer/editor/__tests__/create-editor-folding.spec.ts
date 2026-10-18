/** @vitest-environment jsdom */
import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {foldable, foldedRanges, foldEffect} from '@codemirror/language'
import {afterEach, describe, expect, it} from 'vitest'
import {createEditorFolding} from '../create-editor-folding'
import {createEditorLanguage} from '../create-editor-language'

describe('createEditorFolding', () => {
  let view: EditorView | undefined
  afterEach(() => {
    view?.destroy()
    document.body.replaceChildren()
  })
  it('should fold source without changing its contents and unfold on destination selection', () => {
    const source = 'function greet() {\n  return 42\n}\n'
    const parent = document.createElement('div')
    document.body.append(parent)
    view = new EditorView({
      parent,
      state: EditorState.create({
        doc: source,
        extensions: [createEditorLanguage('main.ts'), createEditorFolding('main.ts')],
      }),
    })
    const range = foldable(view.state, 0, view.state.doc.line(1).to)!
    view.dispatch({effects: foldEffect.of(range)})
    expect(foldedRanges(view.state).size).toBe(1)
    expect(view.state.sliceDoc()).toBe(source)
    view.dispatch({selection: {anchor: source.indexOf('return')}})
    expect(foldedRanges(view.state).size).toBe(0)
    expect(view.state.sliceDoc()).toBe(source)
  })
  it('should expose interactive gutter controls to assistive technology', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    view = new EditorView({
      parent,
      state: EditorState.create({
        doc: 'function greet() {\n  return 42\n}\n',
        extensions: [createEditorLanguage('main.ts'), createEditorFolding('main.ts')],
      }),
    })
    await Promise.resolve()
    const gutter = view.dom.querySelector('.cm-foldGutter')!
    expect(gutter.closest('[aria-hidden="true"]')).toBeNull()
    expect(gutter.querySelector('button[aria-label="접기"]')).not.toBeNull()
  })
})
