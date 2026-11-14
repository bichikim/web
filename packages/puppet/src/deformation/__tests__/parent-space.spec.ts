import {expect, test, vi} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../player/document'
import {createDeferredParentSpaceTransform, createParentSpaceTransform} from '../parent-space'

const node: PuppetSceneDeformerNode = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
  id: 'grid',
  interpolation: 'bilinear',
  kind: 'deformer',
  locked: false,
  name: 'Grid',
  rows: 1,
  visible: true,
}

test('should retain the eager parent-mapping snapshot for existing callers', () => {
  let offset = 2
  const transform = createParentSpaceTransform(node, (point) => ({x: point.x + offset, y: point.y}))
  offset = 5
  expect(transform({x: 0.25, y: 0.5})).toEqual({x: 2.25, y: 0.5})
})

test('should defer world-space points and reuse them for a constant parent mapping', () => {
  const parent = vi.fn((point: {readonly x: number; readonly y: number}) => ({
    x: point.x * 2,
    y: point.y + 3,
  }))
  const transform = createDeferredParentSpaceTransform(node, parent)
  expect(parent).not.toHaveBeenCalled()
  expect(transform({x: 0.25, y: 0.5})).toEqual({x: 0.5, y: 3.5})
  const calls = parent.mock.calls.length
  expect(transform({x: 0.5, y: 0.25})).toEqual({x: 1, y: 3.25})
  expect(parent).toHaveBeenCalledTimes(calls)
})
