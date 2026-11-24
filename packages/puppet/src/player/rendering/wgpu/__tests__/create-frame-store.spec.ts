import {expect, test} from 'vitest'
import {createEmptyDocument} from '../../../create-empty-document'
import {getPartRenderFrame} from '../../../internal/render-plan'
import {createGpuFrameStore} from '../create-frame-store'

test('should use the displayed hit areas until the new frame is shown', () => {
  const positions = [0, 0, 1, 0, 0, 1]
  const source = {
    ...createEmptyDocument(),
    hitAreas: [{id: 'first', name: 'First', partIds: ['part']}],
    parts: [
      {
        id: 'part',
        mesh: {indices: [0, 1, 2], uvs: positions, vertices: positions},
        texture: {height: 1, src: '', width: 1},
      },
    ],
    scene: {
      roots: [{id: 'part', kind: 'part' as const, locked: false, name: 'Part', visible: true}],
    },
  }
  const next = {...source, hitAreas: [{id: 'next', name: 'Next', partIds: ['part']}]}
  const store = createGpuFrameStore(source)
  const original = {frame: getPartRenderFrame(source), vertices: new Float32Array(positions)}
  const shifted = {
    frame: getPartRenderFrame(next),
    vertices: Float32Array.from(positions, (value) => value + 2),
  }

  store.show(original, source)
  original.vertices.fill(10)
  expect(store.updateDocument(next, true)).toBe(true)
  store.applyPreparedFrame(shifted)
  expect(store.hitTest({x: 0.2, y: 0.2})).toBe('first')
  expect(store.redrawable()?.vertices).toEqual(new Float32Array(positions))

  store.show(shifted, next)
  const displayed = shifted.vertices.slice()
  shifted.vertices.fill(10)
  expect(store.redrawable()?.vertices).toEqual(displayed)
  expect(store.hitTest({x: 0.2, y: 0.2})).toBeUndefined()
  expect(store.hitTest({x: 2.2, y: 2.2})).toBe('next')
})
