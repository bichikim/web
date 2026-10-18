import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import type {TextMatch} from '../find-text'

interface EditorSearchOptions {
  readonly matches: readonly TextMatch[]
  readonly active: number
}

const searchMarks = (view: EditorView, {matches, active}: EditorSearchOptions): DecorationSet => {
  const ranges: ReturnType<Decoration['range']>[] = []
  const included = new Set<number>()
  for (const visible of view.visibleRanges) {
    let from = 0
    let to = matches.length
    while (from < to) {
      const middle = Math.floor((from + to) / 2)
      if (matches[middle].end <= visible.from) {
        from = middle + 1
      } else {
        to = middle
      }
    }
    for (
      let index = from;
      index < matches.length && matches[index].start < visible.to;
      index += 1
    ) {
      const match = matches[index]
      const end = Math.min(match.end, view.state.doc.length)
      if (!included.has(index) && match.start < end) {
        included.add(index)
        ranges.push(
          Decoration.mark({class: index === active ? 'cm-search-active' : 'cm-search-match'}).range(
            match.start,
            end,
          ),
        )
      }
    }
  }
  return Decoration.set(ranges, true)
}

/** Highlights sorted, non-overlapping search matches only within visible editor ranges. */
export const createEditorSearch = (options: EditorSearchOptions) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = searchMarks(view, options)
      }

      update(update: ViewUpdate): void {
        if (update.viewportChanged || update.docChanged) {
          this.decorations = searchMarks(update.view, options)
        }
      }
    },
    {decorations: (value) => value.decorations},
  )
