import {expect, test} from 'vitest'

import {
  createDemoDocument,
  parseDocument,
  preparePuppetDocument,
  type PuppetMesh,
  serializeDocument,
} from '../../src/player'
import {createFanMesh, createGridMesh} from '../support/mesh'

const MAXIMUM_PARSE_DURATION_MS = 200

const serializeMesh = (mesh: PuppetMesh) => {
  const document = createDemoDocument()
  const part = document.parts[0]

  expect(part).toBeDefined()

  if (part === undefined) {
    throw new Error('Expected the demo document to contain a part')
  }

  return serializeDocument({...document, parts: [{...part, mesh}]})
}

test('should parse a 50 by 50 regular grid within the browser import budget', () => {
  const source = serializeMesh(createGridMesh(50))
  const startedAt = performance.now()

  expect(parseDocument(source).ok).toBe(true)
  expect(performance.now() - startedAt).toBeLessThan(MAXIMUM_PARSE_DURATION_MS)
})

test('should keep the browser responsive while validating a 5,000 triangle fan', async () => {
  const source = serializeMesh(createFanMesh(5_000))
  const startedAt = performance.now()
  const parsing = preparePuppetDocument({source})
  const tickDuration = await new Promise<number>((resolve) => {
    window.setTimeout(() => resolve(performance.now() - startedAt), 0)
  })

  expect(tickDuration).toBeLessThan(MAXIMUM_PARSE_DURATION_MS)
  expect(await parsing).toMatchObject({ok: true})
})
