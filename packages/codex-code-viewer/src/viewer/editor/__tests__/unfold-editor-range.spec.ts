import {EditorState} from '@codemirror/state'
import {codeFolding, foldedRanges, foldEffect} from '@codemirror/language'
import {describe, expect, it} from 'vitest'
import {unfoldEditorRange} from '../unfold-editor-range'

describe('unfoldEditorRange', () => {
  it('should reveal nested search folds while retaining unrelated folds', () => {
    const source = '123456789012345678901234567890'
    let state = EditorState.create({doc: source, extensions: codeFolding()})
    state = state.update({
      effects: [
        foldEffect.of({from: 1, to: 15}),
        foldEffect.of({from: 3, to: 12}),
        foldEffect.of({from: 20, to: 25}),
      ],
    }).state
    state = state.update({effects: unfoldEditorRange(state, 5, 7)}).state
    expect(foldedRanges(state).size).toBe(1)
    const remaining: number[] = []
    foldedRanges(state).between(0, source.length, (from) => {
      remaining.push(from)
    })
    expect(remaining).toEqual([20])
  })
})
