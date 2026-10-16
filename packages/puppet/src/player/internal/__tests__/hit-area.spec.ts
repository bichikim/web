import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../../document'
import {findHitArea} from '../hit-area'

const square = (id: string) => ({
  id,
  mesh: {
    indices: [0, 1, 2, 1, 3, 2],
    uvs: [0, 0, 1, 0, 0, 1, 1, 1],
    vertices: [0, 0, 1, 0, 0, 1, 1, 1],
  },
  texture: {height: 1, src: `${id}.png`, width: 1},
})

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  hitAreas: [
    {id: 'body', partIds: ['torso']},
    {id: 'head', partIds: ['face']},
  ],
  motions: [],
  parts: [square('torso'), square('face'), square('hair')],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 100, width: 100},
}

const vertices: Record<string, ReadonlyArray<number>> = {
  face: [20, 0, 40, 0, 20, 20, 40, 20],
  hair: [0, 0, 100, 0, 0, 100, 100, 100],
  torso: [0, 10, 50, 10, 0, 60, 50, 60],
}

const hit = (x: number, y: number, paintOrder = ['torso', 'face', 'hair']) =>
  findHitArea({document, paintOrder, point: {x, y}, vertices: (id) => vertices[id]})

describe('findHitArea', () => {
  test('should return the area of the topmost containing part and ignore other parts', () => {
    expect(hit(30, 15)).toBe('head')
    expect(hit(30, 15, ['face', 'torso', 'hair'])).toBe('body')
    expect(hit(10, 40)).toBe('body')
    expect(hit(80, 80)).toBeUndefined()
    expect(hit(0, 10)).toBe('body')
  })
})
