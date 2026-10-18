import {EditorState, type Extension} from '@codemirror/state'
import {codeFolding, foldGutter, foldKeymap, foldService} from '@codemirror/language'
import {keymap, ViewPlugin} from '@codemirror/view'
import {indentFoldRange} from './indent-fold-range'

const accessibleGutter = ViewPlugin.define((view) => {
  // CodeMirror hides its gutters from assistive technology, including interactive markers.
  queueMicrotask(() => {
    const gutter = view.dom.querySelector('.cm-foldGutter')
    const parent = gutter?.parentElement
    parent?.removeAttribute('aria-hidden')
    for (const sibling of parent?.children ?? []) {
      if (sibling !== gutter) {
        sibling.setAttribute('aria-hidden', 'true')
      }
    }
  })
  return {}
})

/** Adds keyboard-accessible fold controls and stream-language body folding. */
export const createEditorFolding = (
  path: string,
  label: (open: boolean) => string = (open) => (open ? '접기' : '펼치기'),
): Extension => [
  accessibleGutter,
  foldService.of((state, start, end) => indentFoldRange(state, start, end, path)),
  codeFolding({
    placeholderDOM: (view, onClick) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ui-code-fold-placeholder'
      button.textContent = '…'
      button.setAttribute('aria-label', view.state.phrase('Unfold line'))
      button.onclick = onClick
      return button
    },
  }),
  foldGutter({
    domEventHandlers: {
      click: (_view, _line, event) => {
        const {target} = event
        if (target instanceof HTMLButtonElement) {
          const parent = target.parentElement
          queueMicrotask(() => parent?.querySelector('button')?.focus({preventScroll: true}))
        }
        return false
      },
    },
    foldingChanged: (update) =>
      update.startState.facet(EditorState.phrases) !== update.state.facet(EditorState.phrases),
    markerDOM: (open) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ui-code-fold'
      button.textContent = open ? '⌄' : '›'
      button.setAttribute('aria-label', label(open))
      button.setAttribute('aria-expanded', String(open))
      return button
    },
  }),
  keymap.of(foldKeymap),
]
