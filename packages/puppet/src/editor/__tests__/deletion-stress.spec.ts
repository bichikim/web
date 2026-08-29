import {expect, it} from 'vitest'

import {
  getMeshTriangles,
  getMeshVertex,
  getSignedArea,
  type MeshPoint,
  validateMesh,
} from '../../mesh'
import {createDemoDocument} from '../../player/create-demo-document'
import type {PuppetDocument, PuppetMesh} from '../../player/document'
import {addPartVertex, deletePartVertex, movePartVertex} from '../edit-document'

const PART_ID = 'mesh-preview'
const STRESS_TEST_TIMEOUT = 60_000

const createFanMesh = (
  sides: number,
  horizontalRadius: number,
  verticalRadius: number,
  innerRadius?: number,
): PuppetMesh => {
  const boundary = Array.from({length: sides}, (_, index) => {
    const angle = (index / sides) * Math.PI * 2
    const radius = innerRadius !== undefined && index % 2 === 1 ? innerRadius : 1
    return {
      x: Math.cos(angle) * horizontalRadius * radius,
      y: Math.sin(angle) * verticalRadius * radius,
    }
  })
  const centerIndex = boundary.length

  return {
    boundaryLoops: [boundary.map((_, index) => index)],
    indices: boundary.flatMap((_, index) => [index, (index + 1) % boundary.length, centerIndex]),
    uvs: [...boundary, {x: 0, y: 0}].flatMap((point) => [
      point.x / (horizontalRadius * 2) + 0.5,
      point.y / (verticalRadius * 2) + 0.5,
    ]),
    vertices: [...boundary, {x: 0, y: 0}].flatMap((point) => [point.x, point.y]),
  }
}

const createDocument = (mesh: PuppetMesh): PuppetDocument => {
  const document = createDemoDocument()
  return {
    ...document,
    motions: [],
    parts: [{...document.parts[0]!, mesh}],
  }
}

const getBoundaryArea = (mesh: PuppetMesh) =>
  (mesh.boundaryLoops ?? []).reduce((total, boundary) => {
    let doubledArea = 0

    for (let index = 0; index < boundary.length; index += 1) {
      const first = getMeshVertex(mesh, boundary[index]!)!
      const second = getMeshVertex(mesh, boundary[(index + 1) % boundary.length]!)!
      doubledArea += first.x * second.y - second.x * first.y
    }

    return total + Math.abs(doubledArea) / 2
  }, 0)

const getTriangleArea = (mesh: PuppetMesh) =>
  getMeshTriangles(mesh).reduce((total, triangle) => {
    const first = getMeshVertex(mesh, triangle[0])!
    const second = getMeshVertex(mesh, triangle[1])!
    const third = getMeshVertex(mesh, triangle[2])!
    const doubledArea =
      (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x)
    return total + Math.abs(doubledArea) / 2
  }, 0)

const expectValidCoverage = (mesh: PuppetMesh, message: string) => {
  const boundaryArea = getBoundaryArea(mesh)
  const areaDifference = Math.abs(getTriangleArea(mesh) - boundaryArea)

  expect(validateMesh(mesh), message).toEqual({valid: true})
  expect(areaDifference, message).toBeLessThanOrEqual(Math.max(1, boundaryArea) * 1e-6)
}

const createRandom = (seed: number) => {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 0x1_0000_0000
    return state / 0x1_0000_0000
  }
}

const getUv = (uvs: ReadonlyArray<number>, vertexIndex: number): MeshPoint => ({
  x: uvs[vertexIndex * 2]!,
  y: uvs[vertexIndex * 2 + 1]!,
})

it(
  'keeps randomized sequential deletions valid and connected',
  () => {
    for (let seed = 1; seed <= 250; seed += 1) {
      const random = createRandom(seed)
      let document = createDemoDocument()

      for (let count = 0; count < 6; count += 1) {
        const mesh = document.parts[0]!.mesh
        const triangles = getMeshTriangles(mesh)
        const triangle = triangles[Math.floor(random() * triangles.length)]!
        const first = getMeshVertex(mesh, triangle[0])!
        const second = getMeshVertex(mesh, triangle[1])!
        const third = getMeshVertex(mesh, triangle[2])!
        const firstWeight = 0.2 + random() * 0.3
        const secondWeight = 0.2 + random() * (0.8 - firstWeight)
        const thirdWeight = 1 - firstWeight - secondWeight
        const added = addPartVertex({
          document,
          partId: PART_ID,
          x: first.x * firstWeight + second.x * secondWeight + third.x * thirdWeight,
          y: first.y * firstWeight + second.y * secondWeight + third.y * thirdWeight,
        })

        expect(added.ok, `seed ${seed} add ${count}`).toBe(true)
        if (added.ok) {
          document = added.document
        }
      }

      while (document.parts[0]!.mesh.vertices.length / 2 > 4) {
        const vertexCount = document.parts[0]!.mesh.vertices.length / 2
        const vertexIndex = Math.floor(random() * vertexCount)
        const deleted = deletePartVertex({document, partId: PART_ID, vertexIndex})

        expect(
          deleted.ok,
          `seed ${seed} delete ${vertexIndex}/${vertexCount}: ${JSON.stringify({
            deleted,
            mesh: document.parts[0]!.mesh,
          })}`,
        ).toBe(true)
        if (!deleted.ok) {
          break
        }

        document = deleted.document
        const mesh = document.parts[0]!.mesh
        expect(validateMesh(mesh), `seed ${seed} validation`).toEqual({valid: true})
        expect(mesh.boundaryLoops, `seed ${seed} boundaries`).toHaveLength(1)
      }
    }
  },
  STRESS_TEST_TIMEOUT,
)

it(
  'keeps mixed operations valid across convex, concave, and slender shapes',
  () => {
    const meshes = [
      createFanMesh(4, 300, 220),
      createFanMesh(12, 300, 220),
      createFanMesh(16, 600, 20),
      createFanMesh(12, 300, 300, 0.4),
    ]

    for (const [meshIndex, initialMesh] of meshes.entries()) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const random = createRandom(seed)
        let document = createDocument(initialMesh)

        for (let operation = 0; operation < 15; operation += 1) {
          const mesh = document.parts[0]!.mesh
          const triangles = getMeshTriangles(mesh)
          const triangle = triangles[Math.floor(random() * triangles.length)]!
          const first = getMeshVertex(mesh, triangle[0])!
          const second = getMeshVertex(mesh, triangle[1])!
          const third = getMeshVertex(mesh, triangle[2])!
          const firstWeight = 0.15 + random() * 0.25
          const secondWeight = 0.15 + random() * (0.7 - firstWeight)
          const thirdWeight = 1 - firstWeight - secondWeight
          const added = addPartVertex({
            document,
            partId: PART_ID,
            x: first.x * firstWeight + second.x * secondWeight + third.x * thirdWeight,
            y: first.y * firstWeight + second.y * secondWeight + third.y * thirdWeight,
          })

          expect(added.ok, `mesh ${meshIndex} seed ${seed} add ${operation}`).toBe(true)
          if (!added.ok) {
            break
          }

          const vertexCount = added.document.parts[0]!.mesh.vertices.length / 2
          const vertexIndex = Math.floor(random() * vertexCount)
          const deleted = deletePartVertex({
            document: added.document,
            partId: PART_ID,
            vertexIndex,
          })

          expect(
            deleted.ok,
            `mesh ${meshIndex} seed ${seed} delete ${vertexIndex} at ${operation}: ${JSON.stringify(
              {
                deleted,
                mesh: added.document.parts[0]!.mesh,
              },
            )}`,
          ).toBe(true)
          if (!deleted.ok) {
            break
          }

          document = deleted.document
          expectValidCoverage(
            document.parts[0]!.mesh,
            `mesh ${meshIndex} seed ${seed} operation ${operation}`,
          )
        }
      }
    }
  },
  STRESS_TEST_TIMEOUT,
)

it(
  'should preserve UV orientation after deformed boundary deletions',
  () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const random = createRandom(seed)
      let document = createDemoDocument()

      for (let operation = 0; operation < 10; operation += 1) {
        const mesh = document.parts[0]!.mesh
        const vertexIndex = Math.floor(random() * (mesh.vertices.length / 2))
        const point = getMeshVertex(mesh, vertexIndex)!
        const moved = movePartVertex({
          document,
          partId: PART_ID,
          vertexIndex,
          x: point.x + (random() - 0.5) * 240,
          y: point.y + (random() - 0.5) * 180,
        })

        if (moved.ok) {
          document = moved.document
        }
      }

      const mesh = document.parts[0]!.mesh
      const boundary = mesh.boundaryLoops?.[0] ?? []
      const deleted = deletePartVertex({
        document,
        partId: PART_ID,
        vertexIndex: boundary[Math.floor(random() * boundary.length)]!,
      })

      if (deleted.ok) {
        const resultMesh = deleted.document.parts[0]!.mesh

        for (const triangle of getMeshTriangles(resultMesh)) {
          const first = getMeshVertex(resultMesh, triangle[0])!
          const second = getMeshVertex(resultMesh, triangle[1])!
          const third = getMeshVertex(resultMesh, triangle[2])!
          const geometryArea = getSignedArea(first, second, third)
          const uvArea = getSignedArea(
            getUv(resultMesh.uvs, triangle[0]),
            getUv(resultMesh.uvs, triangle[1]),
            getUv(resultMesh.uvs, triangle[2]),
          )

          expect(geometryArea * uvArea, `seed ${seed}`).toBeGreaterThan(0)
        }
      }
    }
  },
  STRESS_TEST_TIMEOUT,
)
