import {Box3, Ray, Triangle, Vector3} from 'three'
import type {PuppetSpatialMeshObject} from '../player'
import {transformSpatialMeshObject} from './transform-spatial-mesh-object'

interface MeshTriangle {
  readonly bounds: Box3
  readonly center: Vector3
  readonly triangle: Triangle
}

interface MeshNode {
  readonly bounds: Box3
  readonly left?: MeshNode
  readonly right?: MeshNode
  readonly triangles?: ReadonlyArray<MeshTriangle>
}

const COORDINATES = 3
const LEAF_TRIANGLES = 12
const POSITION_DECIMALS = 6
const RAY_JITTER = 0.000001

const hasClosedSurface = (vertices: ReadonlyArray<number>, indices: ReadonlyArray<number>) => {
  const keys = Array.from({length: vertices.length / COORDINATES}, (_, index) =>
    [0, 1, 2]
      .map((axis) => vertices[index * COORDINATES + axis]!.toFixed(POSITION_DECIMALS))
      .join(','),
  )
  const edges = new Map<string, number>()
  for (let index = 0; index < indices.length; index += COORDINATES) {
    const corners = [indices[index]!, indices[index + 1]!, indices[index + 2]!]
    for (const [first, second] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ] as const) {
      const edge = [keys[corners[first]]!, keys[corners[second]]!].sort().join('|')
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
  }
  return [...edges.values()].every((count) => count === 2)
}

const buildNode = (triangles: ReadonlyArray<MeshTriangle>): MeshNode => {
  const bounds = triangles.reduce((box, item) => box.union(item.bounds), new Box3())
  if (triangles.length <= LEAF_TRIANGLES) {
    return {bounds, triangles}
  }
  const extent = bounds.getSize(new Vector3())
  const axis = extent.x >= extent.y && extent.x >= extent.z ? 'x' : extent.y >= extent.z ? 'y' : 'z'
  const ordered = [...triangles].sort((first, second) => first.center[axis] - second.center[axis])
  const middle = Math.floor(ordered.length / 2)
  return {
    bounds,
    left: buildNode(ordered.slice(0, middle)),
    right: buildNode(ordered.slice(middle)),
  }
}

const nearestDistanceSquared = (
  node: MeshNode,
  point: Vector3,
  closest: Vector3,
  current: number,
): number => {
  const boundDistance = node.bounds.distanceToPoint(point)
  if (boundDistance * boundDistance >= current) {
    return current
  }
  if (node.triangles !== undefined) {
    return node.triangles.reduce((distance, item) => {
      item.triangle.closestPointToPoint(point, closest)
      return Math.min(distance, point.distanceToSquared(closest))
    }, current)
  }
  const children = [node.left, node.right]
    .filter((child): child is MeshNode => child !== undefined)
    .sort(
      (first, second) => first.bounds.distanceToPoint(point) - second.bounds.distanceToPoint(point),
    )
  return children.reduce(
    (distance, child) => nearestDistanceSquared(child, point, closest, distance),
    current,
  )
}

const rayIntersections = (node: MeshNode, ray: Ray, intersection: Vector3, positions: number[]) => {
  if (node.bounds.max.x <= ray.origin.x || !ray.intersectsBox(node.bounds)) {
    return
  }
  if (node.triangles !== undefined) {
    for (const item of node.triangles) {
      const {a: firstVertex, b: secondVertex, c: thirdVertex} = item.triangle
      if (
        ray.intersectTriangle(firstVertex, secondVertex, thirdVertex, false, intersection) !== null
      ) {
        positions.push(intersection.x)
      }
    }
    return
  }
  if (node.left !== undefined) {
    rayIntersections(node.left, ray, intersection, positions)
  }
  if (node.right !== undefined) {
    rayIntersections(node.right, ray, intersection, positions)
  }
}

/** Compiles a triangle mesh into a signed distance query for spatial Boolean operations. */
export const compileSpatialMeshDistance = (object: PuppetSpatialMeshObject) => {
  const mesh = transformSpatialMeshObject(object)
  if (!hasClosedSurface(mesh.vertices, mesh.indices)) {
    throw new RangeError('가져온 메시를 합성하려면 닫힌 3D 형상이 필요합니다.')
  }
  const triangles = Array.from({length: mesh.indices.length / COORDINATES}, (_, index) => {
    const corners = [0, 1, 2].map((corner) => {
      const offset = mesh.indices[index * COORDINATES + corner]! * COORDINATES
      return new Vector3(
        mesh.vertices[offset]!,
        mesh.vertices[offset + 1]!,
        mesh.vertices[offset + 2]!,
      )
    })
    const triangle = new Triangle(corners[0]!, corners[1]!, corners[2]!)
    return {
      bounds: new Box3().setFromPoints(corners),
      center: triangle.getMidpoint(new Vector3()),
      triangle,
    }
  })
  const tree = buildNode(triangles)
  const closest = new Vector3()
  const intersection = new Vector3()
  const ray = new Ray(new Vector3(), new Vector3(1, 0, 0))
  return (coordinates: readonly [number, number, number]): number => {
    const point = new Vector3(...coordinates)
    const distance = Math.sqrt(nearestDistanceSquared(tree, point, closest, Infinity))
    ray.origin.set(point.x, point.y + RAY_JITTER, point.z + RAY_JITTER)
    const positions: number[] = []
    rayIntersections(tree, ray, intersection, positions)
    positions.sort((first, second) => first - second)
    const crossings = positions.filter(
      (position, index) => index === 0 || position - positions[index - 1]! > RAY_JITTER,
    ).length
    return crossings % 2 === 1 ? -distance : distance
  }
}
