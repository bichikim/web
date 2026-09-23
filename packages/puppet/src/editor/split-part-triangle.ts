import {addPartVertex} from './add-part-vertex'
import type {EditDocumentResult, SplitPartTriangleOptions} from './types'

export const splitPartTriangle = (options: SplitPartTriangleOptions): EditDocumentResult =>
  addPartVertex(options)
