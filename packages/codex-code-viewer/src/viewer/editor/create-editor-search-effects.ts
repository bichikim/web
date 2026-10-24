import type {Compartment, EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import type {TextMatch} from '../find-text'
import {createEditorSearch} from './create-editor-search'
import {unfoldEditorRange} from './unfold-editor-range'

interface EditorSearchEffectsOptions {
  readonly state: EditorState
  readonly marks: Compartment
  readonly matches: readonly TextMatch[]
  readonly active: number
  readonly scroll: boolean
}

/** Updates search marks and reveals a requested destination while retaining unrelated folds. */
export const createEditorSearchEffects = ({
  state,
  marks,
  matches,
  active,
  scroll,
}: EditorSearchEffectsOptions) => {
  const effects = [marks.reconfigure(createEditorSearch({active, matches}))]
  const match = matches[active]
  return match === undefined || !scroll
    ? effects
    : [
        ...effects,
        ...unfoldEditorRange(state, match.start, match.end),
        EditorView.scrollIntoView(match.start, {y: 'center'}),
      ]
}
