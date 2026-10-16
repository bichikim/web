import {expect, test} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {mapDocumentReferences} from '../document-references'
import {removeParameterReferences} from '../document-references/remove-parameter-references'
import {mergeDocument} from '../merge-document'

const breathing = (): PuppetDocument => ({
  ...createDemoDocument(),
  breath: [{offset: 0, parameterId: 'angle-x', peak: 10, period: 4, weight: 0.5}],
})

test('should rename, drop and merge breath parameters with their parameters', () => {
  const document = breathing()
  const renamed = mapDocumentReferences({document, rename: (id) => `new:${id}`})
  expect(renamed.breath).toEqual([{...document.breath![0], parameterId: 'new:angle-x'}])
  expect(removeParameterReferences(document, new Set(['angle-x'])).breath).toBeUndefined()
  expect(removeParameterReferences(document, new Set(['other'])).breath).toEqual(document.breath)
  const merged = mergeDocument(document, document)
  expect(merged.ok && merged.document.breath).toEqual([
    document.breath![0],
    {...document.breath![0], parameterId: 'import-1:angle-x'},
  ])
})
