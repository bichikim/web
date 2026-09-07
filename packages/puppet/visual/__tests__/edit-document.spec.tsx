import {expect, test} from 'vitest'

import {movePartVertex} from '../../src/editor/edit-document'
import {createDemoDocument} from '../../src/player'
import {createFanMesh} from '../support/mesh'

const MAXIMUM_EDIT_DURATION_MS = 500

test('should move a vertex in a 5,000 triangle fan within the browser edit budget', () => {
  const document = createDemoDocument()
  const part = document.parts[0]

  expect(part).toBeDefined()

  if (part === undefined) {
    return
  }

  const fanDocument = {...document, parts: [{...part, mesh: createFanMesh(5_000)}]}
  const startedAt = performance.now()
  const result = movePartVertex({
    document: fanDocument,
    partId: part.id,
    vertexIndex: 1,
    x: 0.999,
    y: 0,
  })

  expect(result.ok).toBe(true)
  expect(performance.now() - startedAt).toBeLessThan(MAXIMUM_EDIT_DURATION_MS)
})
