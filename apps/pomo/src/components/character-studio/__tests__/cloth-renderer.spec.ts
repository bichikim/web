import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {Scene} from '@babylonjs/core/scene'
import {expect, it} from 'vitest'
import {createClothRenderer} from '../cloth-renderer'

it('should render world-space fabric with matching normals and restore the original triangles', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const source = new Mesh('dress', scene)
  source.setVerticesData(VertexBuffer.PositionKind, [0, 0, 0, 1, 0, 0, 0, 0, 1])
  source.setVerticesData(VertexBuffer.UVKind, [0, 0, 1, 0, 0, 1])
  source.setIndices([0, 2, 1])
  const renderer = createClothRenderer(
    source,
    new Map([
      [0, 0],
      [1, 1],
      [2, 2],
    ]),
    [0, 2, 1],
  )
  renderer.update([new Vector3(0, 2, 0), new Vector3(1, 2, 0), new Vector3(0, 2, 1)], [0, 1, 2])
  const cloth = scene.getMeshByName('dress-cloth')!
  expect(cloth.skeleton).toBeNull()
  expect(cloth.getVerticesData(VertexBuffer.PositionKind)![1]).toBe(2)
  expect(Math.abs(cloth.getVerticesData(VertexBuffer.NormalKind)![1])).toBeCloseTo(1)
  expect(cloth.getVerticesData(VertexBuffer.UVKind)).toEqual(
    source.getVerticesData(VertexBuffer.UVKind),
  )
  expect(source.getTotalIndices()).toBe(0)
  renderer.dispose()
  expect(scene.getMeshByName('dress-cloth')).toBeNull()
  expect(Array.from(source.getIndices()!)).toEqual([0, 2, 1])
  scene.dispose()
  engine.dispose()
})
