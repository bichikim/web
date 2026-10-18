import type {EditorState} from '@codemirror/state'
import {foldedRanges, unfoldEffect} from '@codemirror/language'

/** Reveals every folded range intersecting a search result or navigation destination. */
export const unfoldEditorRange = (state: EditorState, from: number, to = from) => {
  const effects: ReturnType<typeof unfoldEffect.of>[] = []
  foldedRanges(state).between(from, to, (start, end) => {
    effects.push(unfoldEffect.of({from: start, to: end}))
  })
  return effects
}
