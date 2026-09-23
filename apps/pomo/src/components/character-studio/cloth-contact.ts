import {getMonotonicTime} from 'src/utils/get-monotonic-time'
import type {FloatArray} from '@babylonjs/core/types'
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh'
import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {Ray} from '@babylonjs/core/Culling/ray'
import {Matrix, Vector3} from '@babylonjs/core/Maths/math.vector'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {createClothRenderer} from './cloth-surface'
import {type ClothCapsule, createClothMotion} from './cloth-motion'
import {getProfile} from './profiles'
import type {ClothTriangle} from './cloth-constraints'
import {createClothBinding} from './cloth-binding'

const SETTINGS = {
  clearance: 0.004,
  components: 3,
  epsilon: 0.000001,
  influences: 4,
  initialOffset: 0.001,
  initialPasses: 4,
  matrixSize: 16,
  milliseconds: 1000,
  seamPrecision: 5,
  seatClearance: 0.004,
  seatOrigin: 0.76,
  waistBand: 0.025,
  weightThreshold: 0.01,
}

const selectVertices = (
  mesh: Mesh,
  positions: FloatArray,
  indices: FloatArray,
  weights: FloatArray,
) => {
  const skirt = new Set(
    mesh
      .skeleton!.bones.filter((bone) => /Skirt/u.test(bone.name) && bone.getIndex() >= 0)
      .map((bone) => bone.getIndex()),
  )
  const triangles = mesh.getIndices() ?? []
  const referenced = new Set(triangles)
  const selected = new Set<number>()
  for (let vertex = 0; vertex < positions.length / SETTINGS.components; vertex += 1) {
    for (let influence = 0; influence < SETTINGS.influences; influence += 1) {
      const index = vertex * SETTINGS.influences + influence
      if (
        weights[index] > SETTINGS.weightThreshold &&
        skirt.has(indices[index]) &&
        (triangles.length === 0 || referenced.has(vertex))
      ) {
        selected.add(vertex)
      }
    }
  }

  return selected
}

const createTopology = (
  mesh: Mesh,
  positions: FloatArray,
  indices: FloatArray,
  weights: FloatArray,
) => {
  const triangles = mesh.getIndices() ?? []
  const selected = selectVertices(mesh, positions, indices, weights)
  if (selected.size === 0) {
    return undefined
  }
  const included = new Set(selected)
  const connections: [number, number][] = []
  for (let index = 0; index < triangles.length; index += SETTINGS.components) {
    const triangle = [triangles[index], triangles[index + 1], triangles[index + 2]]
    if (triangle.some((vertex) => selected.has(vertex))) {
      triangle.forEach((vertex) => included.add(vertex))
      connections.push(
        [triangle[0], triangle[1]],
        [triangle[1], triangle[2]],
        [triangle[2], triangle[0]],
      )
    }
  }
  // Weld UV seams so duplicate render vertices cannot tear apart.
  const welded = new Map<string, number>()
  const mapping = new Map<number, number>()
  const representatives: number[] = []
  const pinned: boolean[] = []
  for (const vertex of included) {
    const key = Array.from(
      positions.slice(
        vertex * SETTINGS.components,
        vertex * SETTINGS.components + SETTINGS.components,
      ),
      (value) => value.toFixed(SETTINGS.seamPrecision),
    ).join(',')
    let particle = welded.get(key)
    if (particle === undefined) {
      particle = representatives.length
      welded.set(key, particle)
      representatives.push(vertex)
      pinned.push(false)
    }
    mapping.set(vertex, particle)
    pinned[particle] ||= !selected.has(vertex)
  }
  const edgeKeys = new Set<string>()
  const edges: [number, number][] = []
  for (const [first, second] of connections) {
    const left = mapping.get(first)!
    const right = mapping.get(second)!
    const key = left < right ? `${left}:${right}` : `${right}:${left}`
    if (left !== right && !edgeKeys.has(key)) {
      edgeKeys.add(key)
      edges.push([left, right])
    }
  }

  return {edges, mapping, pinned, representatives, triangles}
}

const prepareMesh = (mesh: AbstractMesh) => {
  if (!(mesh instanceof Mesh) || mesh.skeleton === null) {
    return []
  }
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)
  const indices = mesh.getVerticesData(VertexBuffer.MatricesIndicesKind)
  const weights = mesh.getVerticesData(VertexBuffer.MatricesWeightsKind)
  if (positions === null || indices === null || weights === null) {
    return []
  }
  const topology = createTopology(mesh, positions, indices, weights)
  if (topology === undefined) {
    return []
  }
  const {mapping, pinned, edges, representatives, triangles} = topology
  mesh.makeGeometryUnique()
  const original = Float32Array.from(positions)
  const renderer = createClothRenderer(mesh, mapping, triangles)
  return [
    {
      edges,
      indices,
      mapping,
      mesh,
      original,
      particles: representatives.map(() => 0),
      pinned,
      renderer,
      representatives,
      restTargets: representatives.map(() => Vector3.Zero()),
      skeleton: mesh.skeleton,
      targets: representatives.map(() => Vector3.Zero()),
      transforms: representatives.map(() => Matrix.Identity()),
      triangles,
      weights,
    },
  ]
}

const projectInitial = (targets: readonly Vector3[], capsules: readonly ClothCapsule[]) => {
  const initial = targets.map((point) => point.clone())
  for (let pass = 0; pass < SETTINGS.initialPasses; pass += 1) {
    for (const point of initial) {
      for (const capsule of capsules) {
        const direction = capsule.end.subtract(capsule.start)
        const amount = Math.max(
          0,
          Math.min(
            1,
            Vector3.Dot(point.subtract(capsule.start), direction) /
              Math.max(direction.lengthSquared(), SETTINGS.epsilon),
          ),
        )
        const nearest = capsule.start.add(direction.scale(amount))
        const offset = point.subtract(nearest)
        if (offset.length() < capsule.radius) {
          offset.y = Math.abs(offset.y) + SETTINGS.initialOffset
          point.copyFrom(nearest).addInPlace(offset.normalize().scaleInPlace(capsule.radius))
        }
      }
    }
  }
  return initial
}

const surfaceFaces = (state: ReturnType<typeof prepareMesh>[number]): ClothTriangle[] => {
  const faces: ClothTriangle[] = []
  for (let index = 0; index < state.triangles.length; index += SETTINGS.components) {
    const first = state.mapping.get(state.triangles[index])
    const second = state.mapping.get(state.triangles[index + 1])
    const third = state.mapping.get(state.triangles[index + 2])
    if (first !== undefined && second !== undefined && third !== undefined) {
      faces.push([state.particles[first], state.particles[second], state.particles[third]])
    }
  }
  return faces
}

const createSurface = (
  meshes: ReturnType<typeof prepareMesh>,
  capsules: readonly ClothCapsule[],
  shellName: string,
) => {
  const welded = new Map<string, number>()
  const targets: Vector3[] = []
  const rest: Vector3[] = []
  const faces: ClothTriangle[] = []
  const pinned: boolean[] = []
  const edges: [number, number][] = []
  const shell = meshes.find((state) => state.mesh.name === shellName)
  const shellParticles = new Set<number>()
  for (const state of meshes) {
    for (const [index, point] of state.targets.entries()) {
      const key = point
        .asArray()
        .map((value) => value.toFixed(SETTINGS.seamPrecision))
        .join(',')
      let particle = welded.get(key)
      if (particle === undefined) {
        particle = targets.length
        welded.set(key, particle)
        targets.push(point)
        rest.push(state.restTargets[index].clone())
        pinned.push(false)
      }
      state.particles[index] = particle
      if (shell === undefined || state === shell) {
        shellParticles.add(particle)
      }
      pinned[particle] ||= state.pinned[index]
      if (state.pinned[index]) {
        targets[particle] = point
      }
    }
    for (const [first, second] of shell === undefined || state === shell ? state.edges : []) {
      edges.push([state.particles[first], state.particles[second]])
    }
    if (shell === undefined || state === shell) {
      faces.push(...surfaceFaces(state))
    }
  }
  const particles = [...shellParticles]
  const remap = new Map(particles.map((particle, index) => [particle, index]))
  const proxyRest = particles.map((particle) => rest[particle])
  const proxyTargets = particles.map((particle) => targets[particle])
  const proxyFaces = faces.map(
    ([first, second, third]): ClothTriangle => [
      remap.get(first)!,
      remap.get(second)!,
      remap.get(third)!,
    ],
  )
  const proxyEdges = edges.map(([first, second]): [number, number] => [
    remap.get(first)!,
    remap.get(second)!,
  ])
  const waist = Math.max(...proxyRest.map((point) => point.y)) - SETTINGS.waistBand
  const shellPins = new Set(shell?.particles.filter((_, index) => shell.pinned[index]) ?? [])
  const proxyPins = particles.map((particle) =>
    shell === undefined ? pinned[particle] : shellPins.has(particle) || rest[particle].y >= waist,
  )
  // Starting positions may be projected without changing the garment's rest lengths.
  const initial = projectInitial(proxyTargets, capsules)
  return {
    binding: shell === undefined ? undefined : createClothBinding(proxyRest, proxyFaces, rest),
    motion: createClothMotion(proxyRest, proxyPins, proxyEdges, {
      positions: initial,
      triangles: proxyFaces,
    }),
    targets: proxyTargets,
  }
}

const renderSurface = (
  meshes: ReturnType<typeof prepareMesh>,
  surface: ReturnType<typeof createSurface>,
) => {
  const {binding, motion} = surface
  binding?.update(motion.positions)
  for (const state of meshes) {
    // Keep the shared edge attached to the still-skinned portion of every material.
    if (binding !== undefined) {
      state.pinned.forEach((pinned, index) => {
        if (pinned) {
          binding.positions[state.particles[index]].copyFrom(state.targets[index])
        }
      })
    }
  }
  for (const state of meshes) {
    state.renderer.update(binding?.positions ?? motion.positions, state.particles)
  }
}

export const mountClothContact = (container: AssetContainer, modelUrl: string) => {
  const {rig, shell} = getProfile(modelUrl)
  const colliders = rig.colliders
    .filter((item) => item.node.includes('UpperLeg'))
    .flatMap((item) => {
      const node = container.transformNodes.find((node) => node.name === item.node)
      const knee = container.transformNodes.find(
        (node) => node.name === item.node.replace('UpperLeg', 'LowerLeg'),
      )
      return node === undefined ? [] : [{...item, knee, node}]
    })
  const meshes = container.meshes.flatMap(prepareMesh)
  if (meshes.length === 0) {
    return () => undefined
  }
  const canvas = container.scene.getEngine().getRenderingCanvas()
  const samples: number[] = []
  const measurement = {percentile: 0.95, window: 120}
  let surface: ReturnType<typeof createSurface> | undefined
  let seatHeight: number | undefined
  const hips = container.transformNodes.find((node) => node.name === 'J_Bip_C_Hips')
  const blended = new Float32Array(SETTINGS.matrixSize)
  const observer = container.scene.onBeforeRenderObservable.add(() => {
    const started = getMonotonicTime()
    const capsules = colliders.map((collider, index) => {
      const world = collider.node.computeWorldMatrix(true)
      const next = colliders[index + 1]
      collider.knee?.computeWorldMatrix(true)
      return {
        end:
          next?.node !== collider.node && collider.knee !== undefined
            ? collider.knee.getAbsolutePosition().clone()
            : Vector3.TransformCoordinates(
                Vector3.FromArray(next?.node === collider.node ? next.offset : collider.offset),
                world,
              ),
        radius: collider.radius * Math.abs(collider.node.absoluteScaling.x) + SETTINGS.clearance,
        start: Vector3.TransformCoordinates(Vector3.FromArray(collider.offset), world),
      }
    })
    for (const state of meshes) {
      state.skeleton.prepare(true)
      const matrices = state.skeleton.getTransformMatrices(state.mesh)
      const world = state.mesh.computeWorldMatrix(true)
      for (const [particle, vertex] of state.representatives.entries()) {
        Vector3.TransformCoordinatesToRef(
          Vector3.FromArray(state.original, vertex * SETTINGS.components),
          world,
          state.restTargets[particle],
        )
        blended.fill(0)
        for (let influence = 0; influence < SETTINGS.influences; influence += 1) {
          const index = vertex * SETTINGS.influences + influence
          const offset = state.indices[index] * SETTINGS.matrixSize
          for (let component = 0; component < SETTINGS.matrixSize; component += 1) {
            blended[component] += matrices[offset + component] * state.weights[index]
          }
        }
        Matrix.FromArrayToRef(blended, 0, state.transforms[particle])
        state.transforms[particle].multiplyToRef(world, state.transforms[particle])
        Vector3.TransformCoordinatesToRef(
          Vector3.FromArray(state.original, vertex * SETTINGS.components),
          state.transforms[particle],
          state.targets[particle],
        )
      }
    }
    surface ??= createSurface(meshes, capsules, shell)
    if (seatHeight === undefined && hips !== undefined) {
      const origin = hips.getAbsolutePosition().clone()
      origin.y = SETTINGS.seatOrigin
      const hit = container.scene.pickWithRay(
        new Ray(origin, Vector3.Down()),
        (mesh) => mesh.material?.name.includes('seatCushion') === true,
      )
      if (hit?.pickedPoint !== null && hit?.pickedPoint !== undefined) {
        seatHeight = hit.pickedPoint.y + SETTINGS.seatClearance
      }
    }
    surface.motion.update(
      container.scene.getEngine().getDeltaTime() / SETTINGS.milliseconds,
      surface.targets,
      capsules,
      seatHeight,
    )
    renderSurface(meshes, surface)
    samples.push(getMonotonicTime() - started)
    if (samples.length === measurement.window) {
      samples.sort((left, right) => left - right)
      canvas?.setAttribute(
        'data-cloth-p95-ms',
        String(samples[Math.floor(samples.length * measurement.percentile)]),
      )
      canvas?.setAttribute('data-scene-fps', String(container.scene.getEngine().getFps()))
      samples.length = 0
    }
  })
  return () => {
    container.scene.onBeforeRenderObservable.remove(observer)
    canvas?.removeAttribute('data-cloth-p95-ms')
    canvas?.removeAttribute('data-scene-fps')
    for (const state of meshes) {
      state.renderer.dispose()
    }
  }
}
