import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {addBoundaryGlue} from '../boundary-glue'

test('should batch bind boundary vertices and preserve connections through serialization', () => {
  const document = createDemoDocument()
  const joined = addBoundaryGlue(document, 'mesh-preview', 'shape-diamond', 10000)!
  expect(joined.glue).toHaveLength(4)
  expect(joined.glue?.every((glue) => 'edge' in glue.second && glue.weight === 1)).toBe(true)
  expect(parseDocument(serializeDocument(joined)).ok).toBe(true)
  expect(addBoundaryGlue(joined, 'mesh-preview', 'shape-diamond', 10000)).toBeUndefined()
  expect(addBoundaryGlue(document, 'mesh-preview', 'mesh-preview', 10000)).toBeUndefined()
  expect(addBoundaryGlue(document, 'mesh-preview', 'shape-diamond', -1)).toBeUndefined()
})
