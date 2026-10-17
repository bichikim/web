/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {CreateBoxVertexData} from '@babylonjs/core/Meshes/Builders/boxBuilder'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {Scene} from '@babylonjs/core/scene'
import {measureModelBounds} from '../measure-model-bounds'

const engines: NullEngine[] = []
const setup = () => {
  const engine = new NullEngine()
  engines.push(engine)
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  return {container, scene}
}
const addBox = (scene: Scene, container?: AssetContainer) => {
  const mesh = new Mesh('box', scene)
  CreateBoxVertexData({size: 2}).applyToMesh(mesh)
  container?.meshes.push(mesh)
  return mesh
}

afterEach(() => {
  vi.restoreAllMocks()
  engines.splice(0).forEach((engine) => engine.dispose())
  vi.clearAllMocks()
})

it('should measure only the selected geometry and leave borrowed inputs and the center independent', () => {
  const {container, scene} = setup()
  const first = addBox(scene, container)
  first.position.set(4, 2, -3)
  const second = addBox(scene, container)
  second.position.set(-2, 0, 1)
  addBox(scene).position.set(1000, 1000, 1000)
  const result = measureModelBounds(scene, container)

  expect(result).toEqual({center: new Vector3(1, 1, -1), diameter: Math.sqrt(116)})
  result?.center.setAll(0)
  expect(first.position.asArray()).toEqual([4, 2, -3])
  expect(second.position.asArray()).toEqual([-2, 0, 1])
  expect(container.meshes).toEqual([first, second])
  expect(first.isDisposed()).toBe(false)
  expect(scene.isDisposed).toBe(false)
})

it.each([false, true])(
  'should skip the scene query for empty geometry with an empty mesh: %s',
  (emptyMesh) => {
    const {container, scene} = setup()
    if (emptyMesh) {
      container.meshes.push(new Mesh('empty', scene))
    }
    const query = vi.spyOn(scene, 'getWorldExtends')

    expect(measureModelBounds(scene, container)).toBeNull()
    expect(query).not.toHaveBeenCalled()
  },
)

it.each([
  {label: 'zero', maximum: [0, 0, 0], minimum: [0, 0, 0]},
  {label: 'NaN', maximum: [Number.NaN, 1, 1], minimum: [0, 0, 0]},
  {label: 'infinity', maximum: [Infinity, 1, 1], minimum: [0, 0, 0]},
  {label: 'overflow', maximum: [1e308, 0, 0], minimum: [-1e308, 0, 0]},
  {label: 'underflow', maximum: [1e-320, 0, 0], minimum: [0, 0, 0]},
])('should preserve rejection of a $label diagonal', ({maximum, minimum}) => {
  const {container, scene} = setup()
  addBox(scene, container)
  vi.spyOn(scene, 'getWorldExtends').mockReturnValue({
    max: Vector3.FromArray(maximum),
    min: Vector3.FromArray(minimum),
  })

  expect(measureModelBounds(scene, container)).toBeNull()
})

it('should preserve a finite diagonal without introducing a center finiteness policy', () => {
  const {container, scene} = setup()
  addBox(scene, container)
  vi.spyOn(scene, 'getWorldExtends').mockReturnValue({
    max: new Vector3(1e308, 2, 0),
    min: new Vector3(1e308, 0, 0),
  })

  expect(measureModelBounds(scene, container)).toEqual({
    center: new Vector3(Infinity, 1, 0),
    diameter: 2,
  })
})

it('should retain mesh traversal, duplicate visits, method receivers and bounds getter order', () => {
  const {container, scene} = setup()
  const first = addBox(scene)
  const second = new Mesh('empty', scene)
  const meshes: Mesh[] = []
  meshes[1] = first
  meshes[3] = first
  meshes[4] = second
  const trace: string[] = []
  Object.defineProperty(container, 'meshes', {
    get: () => {
      trace.push('meshes')
      return meshes
    },
  })
  vi.spyOn(first, 'getTotalVertices').mockImplementation(function readVertices(this: Mesh) {
    expect(this).toBe(first)
    trace.push('first')
    return 1
  })
  vi.spyOn(second, 'getTotalVertices').mockImplementation(() => {
    trace.push('second')
    return 0
  })
  vi.spyOn(scene, 'getWorldExtends').mockImplementation(
    function readBounds(this: Scene, predicate) {
      expect(this).toBe(scene)
      trace.push('query')
      expect(predicate?.(first)).toBe(true)
      expect(predicate?.(second)).toBe(false)
      return {
        get max() {
          trace.push('max')
          return new Vector3(2, 0, 0)
        },
        get min() {
          trace.push('min')
          return Vector3.Zero()
        },
      }
    },
  )

  expect(measureModelBounds(scene, container)).toEqual({center: new Vector3(1, 0, 0), diameter: 2})
  expect(trace).toEqual(['meshes', 'first', 'first', 'second', 'query', 'max', 'min'])
})

it.each(['mesh', 'query'] as const)('should propagate a %s failure by identity', (boundary) => {
  const {container, scene} = setup()
  const mesh = addBox(scene, container)
  const marker = new Error('measurement failed')
  if (boundary === 'mesh') {
    vi.spyOn(mesh, 'getTotalVertices').mockImplementation(() => {
      throw marker
    })
  } else {
    vi.spyOn(scene, 'getWorldExtends').mockImplementation(() => {
      throw marker
    })
  }

  let received: unknown
  try {
    measureModelBounds(scene, container)
  } catch (error: unknown) {
    received = error
  }
  expect(received).toBe(marker)
})

it('should keep each scene predicate isolated when a bounds query reenters measurement', () => {
  const {container, scene} = setup()
  const first = addBox(scene, container)
  const innerContainer = new AssetContainer(scene)
  const second = addBox(scene, innerContainer)
  const query = vi.spyOn(scene, 'getWorldExtends')
  query.mockImplementationOnce((outerPredicate) => {
    query.mockImplementationOnce((innerPredicate) => {
      expect(innerPredicate?.(first)).toBe(false)
      expect(innerPredicate?.(second)).toBe(true)
      return {max: new Vector3(4, 0, 0), min: Vector3.Zero()}
    })
    expect(measureModelBounds(scene, innerContainer)).toEqual({
      center: new Vector3(2, 0, 0),
      diameter: 4,
    })
    expect(outerPredicate?.(first)).toBe(true)
    expect(outerPredicate?.(second)).toBe(false)
    return {max: new Vector3(2, 0, 0), min: Vector3.Zero()}
  })

  expect(measureModelBounds(scene, container)).toEqual({center: new Vector3(1, 0, 0), diameter: 2})
})
