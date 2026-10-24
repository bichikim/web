/** @vitest-environment jsdom */
import {EditorState, StateEffect} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createEditorSearch} from '../create-editor-search'

describe('createEditorSearch', () => {
  let view: EditorView
  afterEach(() => {
    view?.destroy()
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })
  it('should decorate only visible sorted matches while preserving the global active index', () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    view = new EditorView({parent, state: EditorState.create({doc: 'word '.repeat(20)})})
    // jsdom has no viewport layout; retain real editor state and rendering around this boundary.
    vi.spyOn(view, 'visibleRanges', 'get').mockReturnValue([{from: 20, to: 30}])
    const matches = Array.from({length: 20}, (_, index) => ({end: index * 5 + 4, start: index * 5}))
    view.dispatch({effects: StateEffect.reconfigure.of(createEditorSearch({active: 5, matches}))})
    expect(view.contentDOM.querySelectorAll('.cm-search-match')).toHaveLength(1)
    expect(view.contentDOM.querySelectorAll('.cm-search-active')).toHaveLength(1)
    expect(view.contentDOM.querySelector('.cm-search-active')?.textContent).toBe('word')
    view.dispatch({effects: StateEffect.reconfigure.of(createEditorSearch({active: 19, matches}))})
    expect(view.contentDOM.querySelectorAll('.cm-search-match')).toHaveLength(2)
    expect(view.contentDOM.querySelectorAll('.cm-search-active')).toHaveLength(0)
  })
  it('should retain a match crossing the viewport boundary without decorating empty ranges', () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    view = new EditorView({parent, state: EditorState.create({doc: 'abcdefghij'})})
    vi.spyOn(view, 'visibleRanges', 'get').mockReturnValue([{from: 4, to: 8}])
    view.dispatch({
      effects: StateEffect.reconfigure.of(
        createEditorSearch({
          active: 0,
          matches: [
            {end: 6, start: 2},
            {end: 7, start: 7},
          ],
        }),
      ),
    })
    expect(view.contentDOM.querySelector('.cm-search-active')?.textContent).toBe('cdef')
    expect(view.contentDOM.querySelectorAll('.cm-search-match')).toHaveLength(0)
  })
})
