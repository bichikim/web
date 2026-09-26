import {describe, expect, test} from 'vitest'

import {PUPPET_SPATIAL_OBJECT_MAX_DEPTH, type PuppetSpatialObject} from '../../player/document'
import {isSpatialMesh} from '../../player/internal/parse-spatial-mesh'
import {generateSpatialMesh} from '../generate-spatial-mesh'

const createNestedObject = (depth: number): PuppetSpatialObject => {
  const primitive = {
    center: [0, 0, 0],
    id: 'leaf',
    kind: 'primitive',
    mode: 'add',
    name: '상자',
    rotation: [0, 0, 0],
    shape: 'box',
    size: [10, 10, 10],
    visible: true,
  } as const
  let object: PuppetSpatialObject = primitive
  for (let index = 0; index < depth; index += 1) {
    object = {
      children: [
        {...object, mode: 'add'},
        {...primitive, id: `sibling-${index}`},
      ],
      id: `group-${index}`,
      kind: 'group',
      mode: 'add',
      name: '그룹',
      visible: true,
    }
  }
  return object
}

describe('generateSpatialMesh', () => {
  test('should keep a rounded control surface compact and consistently outward facing', () => {
    const mesh = generateSpatialMesh({
      operations: [
        {center: [0, 0, 0], id: 'sphere', mode: 'add', shape: 'sphere', size: [10, 10, 10]},
      ],
      resolution: 10,
    })
    const triangles = mesh.indices.length / 3
    const outward = Array.from({length: triangles}, (_, triangle) => {
      const points = mesh.indices
        .slice(triangle * 3, triangle * 3 + 3)
        .map((index) => mesh.vertices.slice(index * 3, index * 3 + 3))
      const [a, b, c] = points
      const u = b!.map((value, axis) => value - a![axis]!)
      const v = c!.map((value, axis) => value - a![axis]!)
      const normal = [
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      ]
      return normal.reduce((sum, value, axis) => sum + value * a![axis]!, 0)
    })
    expect(triangles).toBeLessThan(1000)
    expect(outward.every((value) => value > 0)).toBe(true)
    const edgeCounts = new Map<string, number>()
    for (let triangle = 0; triangle < mesh.indices.length; triangle += 3) {
      for (const edge of [0, 1, 2]) {
        const first = mesh.indices[triangle + edge]!
        const second = mesh.indices[triangle + ((edge + 1) % 3)]!
        const key = [first, second].sort((left, right) => left - right).join(':')
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
      }
    }
    expect([...edgeCounts.values()].every((count) => count === 2)).toBe(true)
  })

  test('should keep authored shapes separate until explicitly combined', () => {
    const first = {
      center: [0, 0, 0],
      id: 'first',
      kind: 'primitive',
      mode: 'add',
      name: '상자',
      rotation: [0, 0, 0],
      shape: 'box',
      size: [10, 10, 10],
      visible: true,
    } as const
    const second = {
      center: [8, 0, 0],
      id: 'second',
      kind: 'primitive',
      mode: 'add',
      name: '구',
      rotation: [0, 0, 0],
      shape: 'sphere',
      size: [6, 6, 6],
      visible: true,
    } as const
    const combined = generateSpatialMesh({
      objects: [
        {
          children: [first, second],
          id: 'joined',
          kind: 'group',
          mode: 'add',
          name: '합친 메시',
          visible: true,
        },
      ],
      resolution: 12,
    })
    expect(combined.source).toMatchObject({
      kind: 'authored',
      objects: [{children: [{id: 'first'}, {id: 'second'}], id: 'joined'}],
    })
    expect(combined.vertices.length).toBeGreaterThan(0)
    expect(combined.indices.length / 3).toBeLessThan(1000)
  })

  test('should reject authored groups beyond the document depth limit', () => {
    expect(() =>
      generateSpatialMesh({
        objects: [createNestedObject(PUPPET_SPATIAL_OBJECT_MAX_DEPTH + 1)],
        resolution: 4,
      }),
    ).toThrow(RangeError)
  })

  test('should generate a parser-compatible authored group at the depth limit', () => {
    const mesh = generateSpatialMesh({
      objects: [createNestedObject(PUPPET_SPATIAL_OBJECT_MAX_DEPTH)],
      resolution: 4,
    })

    expect(isSpatialMesh(mesh)).toBe(true)
  })

  test('should generate a rotated triangular prism', () => {
    const object = {
      center: [0, 0, 0],
      id: 'triangle',
      kind: 'primitive',
      mode: 'add',
      name: '세모',
      rotation: [0, 0, 30],
      shape: 'prism',
      size: [12, 12, 6],
      visible: true,
    } as const
    const mesh = generateSpatialMesh({objects: [object], resolution: 14})
    const unrotated = generateSpatialMesh({
      objects: [{...object, rotation: [0, 0, 0]}],
      resolution: 14,
    })
    expect(mesh.indices.length).toBeGreaterThan(0)
    expect(mesh.vertices).not.toEqual(unrotated.vertices)
    expect(mesh.source.kind).toBe('authored')
  })

  test('should create a closed control surface from a box', () => {
    const mesh = generateSpatialMesh({
      operations: [{center: [5, 5, 0], id: 'body', mode: 'add', shape: 'box', size: [10, 10, 4]}],
      resolution: 12,
    })

    expect(mesh.vertices).toHaveLength(8 * 3)
    expect(mesh.indices).toHaveLength(12 * 3)
    expect(mesh.indices.length % 3).toBe(0)
    expect(Math.max(...mesh.vertices.filter((_, index) => index % 3 === 2))).toBeGreaterThan(1)
    expect(mesh.source.kind).toBe('generated')
    const edgeCounts = new Map<string, number>()
    for (let triangle = 0; triangle < mesh.indices.length; triangle += 3) {
      for (const edge of [0, 1, 2]) {
        const first = mesh.indices[triangle + edge]!
        const second = mesh.indices[triangle + ((edge + 1) % 3)]!
        const key = [first, second].sort((left, right) => left - right).join(':')
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
      }
    }
    expect([...edgeCounts.values()].every((count) => count === 2)).toBe(true)
  })

  test('should keep an authored rotated box low polygon and retain its exact corners', () => {
    const mesh = generateSpatialMesh({
      objects: [
        {
          center: [20, 30, 0],
          id: 'box',
          kind: 'primitive',
          mode: 'add',
          name: '네모',
          rotation: [0, 0, 90],
          shape: 'box',
          size: [10, 20, 4],
          visible: true,
        },
      ],
    })
    const xValues = mesh.vertices.filter((_, index) => index % 3 === 0)
    const yValues = mesh.vertices.filter((_, index) => index % 3 === 1)

    expect(mesh.indices).toHaveLength(12 * 3)
    expect(Math.min(...xValues)).toBeCloseTo(10)
    expect(Math.max(...xValues)).toBeCloseTo(30)
    expect(Math.min(...yValues)).toBeCloseTo(25)
    expect(Math.max(...yValues)).toBeCloseTo(35)
    expect(mesh.source.kind).toBe('authored')
  })

  test('should cut a subtractive shape from the generated volume', () => {
    const mesh = generateSpatialMesh({
      operations: [
        {center: [0, 0, 0], id: 'body', mode: 'add', shape: 'box', size: [10, 10, 10]},
        {center: [0, 0, 0], id: 'cut', mode: 'subtract', shape: 'sphere', size: [4, 4, 4]},
      ],
      resolution: 14,
    })
    expect(mesh.vertices.length).toBeGreaterThan(0)
    expect(mesh.indices.every((index) => index < mesh.vertices.length / 3)).toBe(true)
    expect(mesh.source.kind).toBe('generated')
  })
})
