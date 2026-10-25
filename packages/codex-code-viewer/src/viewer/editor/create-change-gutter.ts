import {gutter, GutterMarker} from '@codemirror/view'
import type {Extension} from '@codemirror/state'
import type {ChangeHunk, ChangeKind} from '../../shared/change-contracts'
import {lineChange} from '../create-line-changes'

interface ChangeGutterOptions {
  readonly hunks: readonly ChangeHunk[]
  readonly labels: Readonly<Record<ChangeKind, string>>
  readonly onOpen?: (hunk: ChangeHunk) => void
  readonly expanded?: ChangeHunk
}
class ChangeMarker extends GutterMarker {
  constructor(
    readonly hunk: ChangeHunk | null,
    readonly label: string,
    readonly open?: (hunk: ChangeHunk) => void,
    readonly boundary?: string,
  ) {
    super()
  }
  eq(other: ChangeMarker): boolean {
    return (
      this.hunk === other.hunk &&
      this.label === other.label &&
      this.open === other.open &&
      this.boundary === other.boundary
    )
  }
  toDOM(): HTMLElement {
    if (this.hunk === null) {
      const spacer = document.createElement('span')
      spacer.className = 'inline-block h-6 w-2.5'
      return spacer
    }
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ui-change-marker'
    button.dataset.change = this.hunk.kind
    if (this.boundary !== undefined) {
      button.dataset.boundary = this.boundary
    }
    button.setAttribute('aria-label', this.label)
    const mark = document.createElement('span')
    mark.className = 'ui-change-mark'
    mark.dataset.change = this.hunk.kind
    mark.setAttribute('aria-hidden', 'true')
    button.append(mark)
    button.onclick = (event) => {
      event.stopPropagation()
      if (this.hunk !== null) {
        this.open?.(this.hunk)
      }
    }
    return button
  }
}

/** Keeps Git marks in a separate interactive gutter, preserving the editor's document and undo history. */
export const createChangeGutter = (options: ChangeGutterOptions): Extension =>
  gutter({
    class: 'cm-changeGutter',
    initialSpacer: () => new ChangeMarker(null, ''),
    lineMarker: (view, line) => {
      const {number} = view.state.doc.lineAt(line.from)
      const hunk = lineChange(options.hunks, number, view.state.doc.lineAt(line.to).number, {
        expanded: options.expanded,
        lineCount: view.state.doc.lines,
      })
      return hunk === undefined
        ? null
        : new ChangeMarker(
            hunk,
            `${number} · ${options.labels[hunk.kind]}`,
            options.onOpen,
            hunk.kind === 'deleted'
              ? hunk.newStart > view.state.doc.lines ||
                (hunk === options.expanded && hunk.newStart > 1)
                ? 'after'
                : hunk.newStart === 1
                  ? 'first'
                  : 'before'
              : undefined,
          )
    },
    lineMarkerChange: () => true,
  })
