import {type Extension, StateField} from '@codemirror/state'
import {Decoration, type DecorationSet, EditorView, WidgetType} from '@codemirror/view'
import {type Owner} from 'solid-js'
import {render} from 'solid-js/web'
import type {InlineChange} from '../types'
import {SChangePanel} from '../SChangePanel'
import {changeAnchor} from '../change-anchor'

interface ChangeInspectionOptions {
  readonly inspection: InlineChange
  readonly owner?: Owner | null
  readonly onClose: () => void
  readonly onNavigate: (index: number) => void
}
class ChangeWidget extends WidgetType {
  private readonly disposals = new WeakMap<HTMLElement, VoidFunction>()
  constructor(readonly options: ChangeInspectionOptions) {
    super()
  }
  toDOM(view: EditorView): HTMLElement {
    const element = document.createElement('div')
    element.className = 'sticky left-0 w-[calc(100cqw-6rem)] max-w-full'
    element.contentEditable = 'false'
    const dispose = render(
      () => (
        <SChangePanel
          inspection={this.options.inspection}
          onClose={this.options.onClose}
          onNavigate={this.options.onNavigate}
        />
      ),
      element,
      undefined,
      {owner: this.options.owner},
    )
    this.disposals.set(element, dispose)
    view.requestMeasure()
    return element
  }
  destroy(element: HTMLElement): void {
    this.disposals.get(element)?.()
    this.disposals.delete(element)
  }
}

/** A block decoration participates in layout without inserting text into the document. */
export const createChangeInspection = (options: ChangeInspectionOptions): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => {
      const hunk = options.inspection.hunks[options.inspection.active]
      if (hunk === undefined) {
        return Decoration.none
      }
      const line = changeAnchor(hunk, state.doc.lines)
      const position = line === 0 ? 0 : state.doc.line(line).to
      return Decoration.set([
        Decoration.widget({
          block: true,
          side: line === 0 ? -1 : 1,
          widget: new ChangeWidget(options),
        }).range(position),
      ])
    },
    provide: (field) => EditorView.decorations.from(field),
    update: (value, transaction) => value.map(transaction.changes),
  })
