import {expect, test} from 'vitest'

import {
  bindSpatialPartToMesh,
  createSpatialMeshAttachmentSampler,
  placeSpatialMesh,
  resolveSpatialMeshAttachment,
} from '../bind-spatial-mesh'

const mesh = {
  indices: [0, 1, 2, 3, 4, 5],
  source: {kind: 'imported' as const, name: 'stack.glb'},
  vertices: [0, 0, -2, 10, 0, -2, 0, 10, -2, 0, 0, 4, 10, 0, 4, 0, 10, 4],
}

test('should attach overlapping image points to the frontmost triangle', () => {
  const sample = createSpatialMeshAttachmentSampler(mesh)(2, 2)!
  expect(sample.attachment.triangleIndex).toBe(1)
  expect(sample.point).toEqual([2, 2, 4])
  const moved = [...mesh.vertices]
  moved[3 * 3 + 2] += 10
  expect(
    resolveSpatialMeshAttachment({...mesh, vertices: moved}, sample.attachment)?.[2],
  ).toBeGreaterThan(4)
})

test('should preserve the distance from the nearest surface for an image point outside the mesh', () => {
  const sample = createSpatialMeshAttachmentSampler(mesh)(12, 2)!
  expect(sample.point).toEqual([12, 2, 4])
  expect(sample.attachment.offset[0]).toBeGreaterThan(0)
  expect(resolveSpatialMeshAttachment(mesh, sample.attachment)).toEqual([12, 2, 4])
})

test('should keep the front surface when coincident edges are sampled outside the mesh', () => {
  const sharedEdgeMesh = {
    indices: [0, 1, 2, 3, 4, 5],
    source: {kind: 'imported' as const, name: 'shared-edge.glb'},
    vertices: [
      25.142857142857142, 8, -68.75803966468904, 56, 0, -50.742431640625, 21.714285714285715, 6,
      -50.742431640625, 21.714285714285715, 6, 29.192626953125, 56, 0, 29.192626953125,
      22.01068673721854, 6.2046972749443325, 55.837646484375,
    ],
  }
  const sample = createSpatialMeshAttachmentSampler(sharedEdgeMesh)

  for (const meshX of [0, 2.3546875, 4.709375, 7.0640625, 9.41875]) {
    expect(sample(54 - meshX, 0)?.point[2]).toBeCloseTo(29.192626953125)
  }
})

test('should bind a translated mesh using its original surface coordinates', () => {
  const part = {
    id: 'image',
    mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [2, 2, 8, 2, 2, 8]},
    spatial: {controlPoints: [2, 2, 0, 8, 2, 0, 2, 8, 0], origin: [0, 0, 0] as const},
    texture: {height: 10, src: 'image.png', width: 10},
  }
  const position = [2, 0, 3] as const
  const placed = bindSpatialPartToMesh(part, mesh, position)
  const translated = bindSpatialPartToMesh(part, placeSpatialMesh(mesh, position))

  placed?.spatial?.controlPoints.forEach((coordinate, index) =>
    expect(coordinate).toBeCloseTo(translated?.spatial?.controlPoints[index]!),
  )
  placed?.spatial?.attachments?.forEach((attachment, index) => {
    const expected = translated?.spatial?.attachments?.[index]
    expect(attachment.triangleIndex).toBe(expected?.triangleIndex)
    attachment.weights.forEach((weight, axis) =>
      expect(weight).toBeCloseTo(expected?.weights[axis]!),
    )
    attachment.offset.forEach((offset, axis) => expect(offset).toBeCloseTo(expected?.offset[axis]!))
  })
})
