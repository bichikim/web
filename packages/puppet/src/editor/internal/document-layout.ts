import type {PuppetDocument, PuppetLayout} from '../../player'

/** Sets or, with `undefined`, removes the document's default framing. */
export const setDocumentLayout = (
  document: PuppetDocument,
  layout: PuppetLayout | undefined,
): PuppetDocument => {
  if (layout !== undefined) {
    return {...document, layout}
  }
  const {layout: _layout, ...rest} = document
  return rest
}
