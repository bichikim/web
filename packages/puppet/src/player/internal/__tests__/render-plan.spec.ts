import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
  type PuppetPartRenderProperties,
} from '../../document'
import {canReusePartResources, getPartRenderPlans} from '../render-plan'

const createPart = (id: string, properties?: PuppetPartRenderProperties): PuppetPart => ({
  id,
  mesh: {
    boundaryLoops: [[0, 1, 2]],
    indices: [0, 1, 2],
    uvs: [0, 0, 1, 0, 0, 1],
    vertices: [0, 0, 1, 0, 0, 1],
  },
  properties,
  texture: {height: 1, src: `${id}.png`, width: 1},
})

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts: [
    createPart('target', {clippingMaskIds: ['middle'], opacity: 0.5}),
    createPart('middle', {
      clippingMaskIds: ['source'],
      invertedMask: true,
      renderWhenUsedAsMask: false,
    }),
    createPart('source'),
  ],
  scene: {
    roots: [
      {id: 'target', kind: 'part', locked: false, name: 'Target', visible: true},
      {id: 'middle', kind: 'part', locked: false, name: 'Middle', visible: true},
      {id: 'source', kind: 'part', locked: false, name: 'Source', visible: true},
    ],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

describe('getPartRenderPlans', () => {
  test('should resolve scene order, mask visibility, render properties, and chained masks', () => {
    const plans = getPartRenderPlans(createDocument())

    expect(plans).toMatchObject([
      {
        mask: {
          sources: [
            {
              mask: {sources: [{partId: 'source'}]},
              partId: 'middle',
            },
          ],
        },
        partId: 'target',
        properties: {opacity: 0.5},
        visible: true,
      },
      {
        mask: {sources: [{partId: 'source'}]},
        partId: 'middle',
        properties: {invertedMask: true},
        visible: false,
      },
      {
        partId: 'source',
        properties: {renderWhenUsedAsMask: true},
        visible: true,
      },
    ])
  })
})

describe('canReusePartResources', () => {
  test('should reject mask topology and clipping graph changes but allow target topology changes', () => {
    const document = createDocument()
    const changedTarget = {
      ...document,
      parts: document.parts.map((part) =>
        part.id === 'target'
          ? {...part, mesh: {...part.mesh, uvs: [...part.mesh.uvs].reverse()}}
          : part,
      ),
    }
    const changedSource = {
      ...document,
      parts: document.parts.map((part) =>
        part.id === 'source'
          ? {...part, mesh: {...part.mesh, uvs: [...part.mesh.uvs].reverse()}}
          : part,
      ),
    }
    const changedGraph = {
      ...document,
      parts: document.parts.map((part) =>
        part.id === 'target'
          ? {...part, properties: {...part.properties, clippingMaskIds: []}}
          : part,
      ),
    }

    expect(canReusePartResources(document, document)).toBe(true)
    expect(canReusePartResources(document, changedTarget)).toBe(true)
    expect(canReusePartResources(document, changedSource)).toBe(false)
    expect(canReusePartResources(document, changedGraph)).toBe(false)
  })
})
