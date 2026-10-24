import {type Accessor, createEffect, on, untrack} from 'solid-js'
import type {PuppetDocument} from '../player'
interface DocumentReplacementOptions {
  /** Current editor document, used to ignore its own publication. */
  readonly current: Accessor<PuppetDocument>
  /** Externally loaded document. Undefined leaves the editor history unchanged. */
  readonly incoming: Accessor<PuppetDocument | undefined>
  /** Replaces the document as one undoable editor operation. */
  readonly onReplace: (document: PuppetDocument) => void
}
export const useDocumentReplacement = (options: DocumentReplacementOptions) =>
  createEffect(
    on(options.incoming, (document) => {
      if (document !== undefined && document !== untrack(options.current)) {
        untrack(() => options.onReplace(document))
      }
    }),
  )
