import {type Extension, StateEffect, StateField} from '@codemirror/state'
import {syntaxTree} from '@codemirror/language'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import type {CodeToken} from '../../shared/contracts'
import {navigationToken} from './navigation-token'
import {isNavigableFile} from '../../shared/is-navigable-file'

interface EditorNavigationOptions {
  readonly path: string
  readonly onFollow: (token: CodeToken) => void
}
const modifierChange = StateEffect.define<boolean>()

const navigationMarks = (view: EditorView, path: string): DecorationSet => {
  const marks: ReturnType<Decoration['range']>[] = []
  for (const visible of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      enter: (node) => {
        if (node.node.firstChild !== null) {
          return
        }
        const token = navigationToken(view.state, node.from, path)
        if (token !== null) {
          marks.push(
            Decoration.mark({
              attributes: {'data-navigation': token.navigation ?? ''},
              class: 'ui-editor-link',
            }).range(node.from, node.to),
          )
        }
      },
      from: visible.from,
      to: visible.to,
    })
  }
  return Decoration.set(marks, true)
}

/** Adds source links, modifier-click navigation and F12 without changing document contents. */
export const createEditorNavigation = (options: EditorNavigationOptions): Extension => {
  if (!isNavigableFile(options.path)) {
    return []
  }
  const modifier = StateField.define<boolean>({
    create: () => false,
    provide: (field) =>
      EditorView.contentAttributes.from(field, (value) => ({
        'data-navigation-modifier': String(value),
      })),
    update: (value, transaction) =>
      transaction.effects.filter((effect) => effect.is(modifierChange)).at(-1)?.value ?? value,
  })
  const setModifier = (view: EditorView, value: boolean): void => {
    if (view.state.field(modifier) !== value) {
      view.dispatch({effects: modifierChange.of(value)})
    }
  }

  const links = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = navigationMarks(view, options.path)
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state)
        ) {
          this.decorations = navigationMarks(update.view, options.path)
        }
      }
    },
    {decorations: (value) => value.decorations},
  )
  return [
    links,
    modifier,
    EditorView.domEventHandlers({
      blur: (_event, view) => {
        setModifier(view, false)
      },
      keydown: (event, view) => {
        setModifier(view, event.metaKey || event.ctrlKey)
        return false
      },
      keyup: (event, view) => {
        setModifier(view, event.metaKey || event.ctrlKey)
        return false
      },
      mousedown: (event, view) => {
        if (
          event.button !== 0 ||
          event.altKey ||
          event.shiftKey ||
          !(event.metaKey || event.ctrlKey)
        ) {
          return false
        }
        const position = view.posAtCoords({x: event.clientX, y: event.clientY})
        const token = position === null ? null : navigationToken(view.state, position, options.path)
        if (token === null) {
          return false
        }
        event.preventDefault()
        options.onFollow(token)
        return true
      },
    }),
    keymap.of([
      {
        key: 'F12',
        run: (view) => {
          const token = navigationToken(view.state, view.state.selection.main.head, options.path)
          if (token === null) {
            return false
          }
          options.onFollow(token)
          return true
        },
      },
    ]),
  ]
}
