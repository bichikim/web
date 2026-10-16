import {Compartment, EditorState} from '@codemirror/state'
import {codeFolding, foldedRanges, foldEffect} from '@codemirror/language'
import {describe, expect, it} from 'vitest'
import {createEditorSearchEffects} from '../create-editor-search-effects'

describe('createEditorSearchEffects', () => {
  it.each([true, false])(
    'should reveal a matching fold only for a requested search scroll: %s',
    (scroll) => {
      const marks = new Compartment()
      let state = EditorState.create({
        doc: 'function test() {\n  value\n}',
        extensions: [codeFolding(), marks.of([])],
      })
      state = state.update({effects: foldEffect.of({from: 17, to: 24})}).state
      const effects = createEditorSearchEffects({
        active: 0,
        marks,
        matches: [{end: 23, start: 20}],
        scroll,
        state,
      })
      state = state.update({effects}).state
      expect(foldedRanges(state).size).toBe(scroll ? 0 : 1)
      expect(state.doc.toString()).toBe('function test() {\n  value\n}')
    },
  )
})
