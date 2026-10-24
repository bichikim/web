import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

import type {PuppetPart, PuppetSpatialMesh} from '../../player'
import {createSpatialReferenceVertices} from './create-spatial-reference-vertices'
import {projectSpatialPreviewGizmo, type SpatialPreviewGizmo} from './spatial-preview-gizmo'

export interface SpatialPreviewOrbit {
  readonly pitch: number
  readonly yaw: number
}

export interface SpatialPreviewMesh extends PuppetSpatialMesh {
  readonly ranges?: ReadonlyArray<{
    id: string
    start: number
    end: number
    vertexStart: number
    vertexEnd: number
  }>
}

export interface SpatialMeshPreviewFrame {
  readonly mesh?: SpatialPreviewMesh
  readonly mutedIds: ReadonlySet<string>
  readonly orbit: SpatialPreviewOrbit
  readonly pivot?: readonly [number, number, number]
  readonly referenceParts: ReadonlyArray<PuppetPart>
  readonly targetBounds?: {x: number; y: number; width: number; height: number}
}

export interface SpatialMeshPreviewRenderer {
  destroy(): void
  pick(clientX: number, clientY: number): string | undefined
  render(frame: SpatialMeshPreviewFrame): SpatialPreviewGizmo | undefined
  resize(): SpatialPreviewGizmo | undefined
}

interface Surface {
  readonly edges: LineSegments<BufferGeometry, LineBasicMaterial>
  readonly faces: Mesh<BufferGeometry, MeshLambertMaterial>
  readonly id?: string
}

interface ReferenceSurface {
  readonly face: Mesh<BufferGeometry, MeshBasicMaterial>
  readonly texture: ReturnType<TextureLoader['load']>
}

const COORDINATES = 3
const VIEW_MARGIN = 1.15
const CAMERA_FAR_RADIUS = 8
const CAMERA_DISTANCE_RADIUS = 3
const DEGREES_PER_CIRCLE = 180
const LIGHT_DEPTH = 3
const REFERENCE_FACE_OPACITY = 0.4
const TARGET_FRAME_COORDINATES = 3
const DEPTH_AXIS = 2
const TARGET_FRAME_LIFT = 0.25
const TARGET_FRAME_PADDING_RATIO = 0.02
const getStyle = (canvas: HTMLCanvasElement, name: string) =>
  getComputedStyle(canvas).getPropertyValue(name).trim()

const getMeshBounds = (mesh: PuppetSpatialMesh | undefined, parts: ReadonlyArray<PuppetPart>) => {
  const minimum = [Infinity, Infinity, Infinity]
  const maximum = [-Infinity, -Infinity, -Infinity]
  const include = (x: number, y: number, z: number) => {
    minimum[0] = Math.min(minimum[0]!, x)
    minimum[1] = Math.min(minimum[1]!, y)
    minimum[2] = Math.min(minimum[2]!, z)
    maximum[0] = Math.max(maximum[0]!, x)
    maximum[1] = Math.max(maximum[1]!, y)
    maximum[2] = Math.max(maximum[2]!, z)
  }
  if (mesh !== undefined) {
    for (let index = 0; index < mesh.vertices.length; index += COORDINATES) {
      include(mesh.vertices[index]!, -mesh.vertices[index + 1]!, mesh.vertices[index + 2]!)
    }
  }
  for (const part of parts) {
    for (let index = 0; index < part.mesh.vertices.length; index += 2) {
      include(part.mesh.vertices[index]!, -part.mesh.vertices[index + 1]!, 0)
    }
  }
  if (!Number.isFinite(minimum[0])) {
    return {center: new Vector3(), radius: 1}
  }
  const center = new Vector3(
    (minimum[0]! + maximum[0]!) / 2,
    (minimum[1]! + maximum[1]!) / 2,
    (minimum[2]! + maximum[2]!) / 2,
  )
  const radius = Math.max(
    1,
    Math.hypot(maximum[0]! - center.x, maximum[1]! - center.y, maximum[2]! - center.z) *
      VIEW_MARGIN,
  )
  return {center, radius}
}

const createReferenceSurface = (
  part: PuppetPart,
  mesh: SpatialPreviewMesh | undefined,
  onLoad: () => void,
): ReferenceSurface | undefined => {
  const positions = createSpatialReferenceVertices(part, mesh)
  if (positions === undefined) {
    return undefined
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, COORDINATES))
  geometry.setAttribute(
    'uv',
    new BufferAttribute(
      new Float32Array(part.mesh.uvs.map((value, index) => (index % 2 === 0 ? value : 1 - value))),
      2,
    ),
  )
  geometry.setIndex(new BufferAttribute(new Uint32Array(part.mesh.indices), 1))
  const texture = new TextureLoader().load(part.texture.src, onLoad)
  const face = new Mesh(
    geometry,
    new MeshBasicMaterial({
      depthWrite: false,
      map: texture,
      opacity: part.properties?.opacity ?? 1,
      side: DoubleSide,
      transparent: true,
    }),
  )
  return {face, texture}
}

const createTargetFrame = (
  canvas: HTMLCanvasElement,
  bounds: NonNullable<SpatialMeshPreviewFrame['targetBounds']>,
  mesh: SpatialPreviewMesh | undefined,
): LineSegments<BufferGeometry, LineBasicMaterial> => {
  const padding = Math.max(bounds.width, bounds.height) * TARGET_FRAME_PADDING_RATIO
  const left = bounds.x - padding
  const right = bounds.x + bounds.width + padding
  const top = -bounds.y + padding
  const bottom = -(bounds.y + bounds.height) - padding
  const front = mesh?.vertices.reduce(
    (depth, value, index) => (index % COORDINATES === DEPTH_AXIS ? Math.max(depth, value) : depth),
    -Infinity,
  )
  const z = Number.isFinite(front) ? front! + TARGET_FRAME_LIFT : 0
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([
        left,
        top,
        z,
        right,
        top,
        z,
        right,
        top,
        z,
        right,
        bottom,
        z,
        right,
        bottom,
        z,
        left,
        bottom,
        z,
        left,
        bottom,
        z,
        left,
        top,
        z,
      ]),
      TARGET_FRAME_COORDINATES,
    ),
  )
  return new LineSegments(
    geometry,
    new LineBasicMaterial({
      color: new Color(getStyle(canvas, '--spatial-preview-target-frame')),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    }),
  )
}

interface ReplaceTargetFrameOptions {
  readonly scene: Scene
  readonly canvas: HTMLCanvasElement
  readonly current: LineSegments<BufferGeometry, LineBasicMaterial> | undefined
  readonly bounds: SpatialMeshPreviewFrame['targetBounds']
  readonly mesh: SpatialPreviewMesh | undefined
}

const replaceTargetFrame = ({scene, canvas, current, bounds, mesh}: ReplaceTargetFrameOptions) => {
  if (current !== undefined) {
    scene.remove(current)
    current.geometry.dispose()
    current.material.dispose()
  }
  const next = bounds === undefined ? undefined : createTargetFrame(canvas, bounds, mesh)
  if (next !== undefined) {
    scene.add(next)
  }
  return next
}

const createTargetFrameController = (scene: Scene, canvas: HTMLCanvasElement) => {
  let sourceBounds: SpatialMeshPreviewFrame['targetBounds']
  let sourceMesh: SpatialPreviewMesh | undefined
  let current: LineSegments<BufferGeometry, LineBasicMaterial> | undefined
  return {
    destroy() {
      replaceTargetFrame({bounds: undefined, canvas, current, mesh: undefined, scene})
    },
    update(bounds: SpatialMeshPreviewFrame['targetBounds'], mesh: SpatialPreviewMesh | undefined) {
      if (bounds === sourceBounds && mesh === sourceMesh) {
        return
      }
      sourceBounds = bounds
      sourceMesh = mesh
      current = replaceTargetFrame({bounds, canvas, current, mesh, scene})
    },
  }
}

const createSurface = (
  canvas: HTMLCanvasElement,
  mesh: SpatialPreviewMesh,
  range: {id?: string; start: number; end: number; vertexStart: number; vertexEnd: number},
  faceColor: Color,
): Surface => {
  const positions = new Float32Array((range.vertexEnd - range.vertexStart) * COORDINATES)
  for (let vertex = range.vertexStart; vertex < range.vertexEnd; vertex += 1) {
    const source = vertex * COORDINATES
    const target = (vertex - range.vertexStart) * COORDINATES
    positions[target] = mesh.vertices[source]!
    positions[target + 1] = -mesh.vertices[source + 1]!
    positions[target + 2] = mesh.vertices[source + 2]!
  }
  const indices = new Uint32Array((range.end - range.start) * COORDINATES)
  for (let index = range.start * COORDINATES; index < range.end * COORDINATES; index += 1) {
    indices[index - range.start * COORDINATES] = mesh.indices[index]! - range.vertexStart
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, COORDINATES))
  geometry.setIndex(new BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  const faces = new Mesh(
    geometry,
    new MeshLambertMaterial({
      color: faceColor,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
      transparent: true,
    }),
  )
  const edges = new LineSegments(
    new EdgesGeometry(geometry, Number(getStyle(canvas, '--spatial-preview-edge-angle'))),
    new LineBasicMaterial({
      color: new Color(getStyle(canvas, '--spatial-preview-edge')),
      transparent: true,
    }),
  )
  return {edges, faces, id: range.id}
}

interface UpdateCameraOptions {
  readonly camera: OrthographicCamera
  readonly canvas: HTMLCanvasElement
  readonly mesh?: SpatialPreviewMesh
  readonly parts: ReadonlyArray<PuppetPart>
  readonly orbit: SpatialPreviewOrbit
}

const updateCamera = (options: UpdateCameraOptions) => {
  const {camera, canvas, mesh, parts, orbit} = options
  const {center, radius} = getMeshBounds(mesh, parts)
  const width = Math.max(1, canvas.clientWidth)
  const height = Math.max(1, canvas.clientHeight)
  const aspect = width / height
  const halfHeight = radius / Math.min(1, aspect)
  camera.left = -halfHeight * aspect
  camera.right = halfHeight * aspect
  camera.top = halfHeight
  camera.bottom = -halfHeight
  camera.near = 0.1
  camera.far = radius * CAMERA_FAR_RADIUS + 1
  const pitch = (orbit.pitch * Math.PI) / DEGREES_PER_CIRCLE
  const yaw = (orbit.yaw * Math.PI) / DEGREES_PER_CIRCLE
  const distance = radius * CAMERA_DISTANCE_RADIUS
  camera.position.set(
    center.x - Math.sin(yaw) * Math.cos(pitch) * distance,
    center.y - Math.sin(pitch) * distance,
    center.z + Math.cos(yaw) * Math.cos(pitch) * distance,
  )
  camera.lookAt(center)
  camera.updateProjectionMatrix()
}

/** Draws the mesh editor preview and resolves shape selection from its visible 3D surface. */
export const createSpatialMeshPreviewRenderer = (
  canvas: HTMLCanvasElement,
): SpatialMeshPreviewRenderer => {
  const renderer = new WebGLRenderer({alpha: false, antialias: true, canvas})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const scene = new Scene()
  scene.background = new Color(getStyle(canvas, '--spatial-preview-background'))
  const camera = new OrthographicCamera()
  const ambient = new AmbientLight(
    new Color(getStyle(canvas, '--spatial-preview-light')),
    Number(getStyle(canvas, '--spatial-preview-ambient')),
  )
  const directional = new DirectionalLight(
    new Color(getStyle(canvas, '--spatial-preview-light')),
    Number(getStyle(canvas, '--spatial-preview-directional')),
  )
  directional.position.set(-1, 2, LIGHT_DEPTH)
  scene.add(ambient, directional)
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const surfaces: Surface[] = []
  const references: ReferenceSurface[] = []
  const faceColor = new Color(getStyle(canvas, '--spatial-preview-face'))
  const mutedColor = new Color(getStyle(canvas, '--spatial-preview-muted'))
  const targetGuide = createTargetFrameController(scene, canvas)
  let sourceMesh: SpatialPreviewMesh | undefined
  let sourceReferenceMesh: SpatialPreviewMesh | undefined
  let sourceParts: ReadonlyArray<PuppetPart> | undefined
  let frame: SpatialMeshPreviewFrame | undefined
  let destroyed = false
  let canvasWidth = 0
  let canvasHeight = 0

  const clearSurfaces = () => {
    for (const surface of surfaces) {
      scene.remove(surface.faces, surface.edges)
      surface.faces.geometry.dispose()
      surface.faces.material.dispose()
      surface.edges.geometry.dispose()
      surface.edges.material.dispose()
    }
    surfaces.length = 0
  }

  const clearReferences = () => {
    for (const reference of references) {
      scene.remove(reference.face)
      reference.face.geometry.dispose()
      reference.face.material.dispose()
      reference.texture.dispose()
    }
    references.length = 0
  }

  const draw = () => {
    if (frame === undefined) {
      return
    }
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    if (width !== canvasWidth || height !== canvasHeight) {
      renderer.setSize(width, height, false)
      canvasWidth = width
      canvasHeight = height
    }
    if (frame.mesh !== sourceMesh) {
      clearSurfaces()
      sourceMesh = frame.mesh
      if (sourceMesh !== undefined) {
        const ranges = sourceMesh.ranges ?? [
          {
            end: sourceMesh.indices.length / COORDINATES,
            start: 0,
            vertexEnd: sourceMesh.vertices.length / COORDINATES,
            vertexStart: 0,
          },
        ]
        for (const range of ranges) {
          const surface = createSurface(canvas, sourceMesh, range, faceColor)
          scene.add(surface.faces, surface.edges)
          surfaces.push(surface)
        }
      }
    }
    if (frame.referenceParts !== sourceParts || frame.mesh !== sourceReferenceMesh) {
      clearReferences()
      sourceParts = frame.referenceParts
      sourceReferenceMesh = frame.mesh
      for (const part of sourceParts) {
        const reference = createReferenceSurface(part, frame.mesh, redrawLoadedTexture)
        if (reference !== undefined) {
          scene.add(reference.face)
          references.push(reference)
        }
      }
    }
    targetGuide.update(frame.targetBounds, frame.mesh)
    for (const surface of surfaces) {
      surface.faces.material.color.copy(
        surface.id !== undefined && frame.mutedIds.has(surface.id) ? mutedColor : faceColor,
      )
      surface.faces.material.opacity = frame.referenceParts.length > 0 ? REFERENCE_FACE_OPACITY : 1
    }
    updateCamera({
      camera,
      canvas,
      mesh: frame.mesh,
      orbit: frame.orbit,
      parts: frame.referenceParts,
    })
    renderer.render(scene, camera)
    return projectSpatialPreviewGizmo(frame.pivot, camera, canvasWidth, canvasHeight)
  }

  function redrawLoadedTexture() {
    if (!destroyed) {
      draw()
    }
  }

  return {
    destroy() {
      destroyed = true
      clearSurfaces()
      clearReferences()
      targetGuide.destroy()
      renderer.forceContextLoss()
      renderer.dispose()
    },
    pick(clientX, clientY) {
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) {
        return undefined
      }
      pointer.set(
        ((clientX - bounds.left) / bounds.width) * 2 - 1,
        1 - ((clientY - bounds.top) / bounds.height) * 2,
      )
      raycaster.setFromCamera(pointer, camera)
      const [hit] = raycaster.intersectObjects(surfaces.map((surface) => surface.faces))
      return surfaces.find((surface) => surface.faces === hit?.object)?.id
    },
    render(nextFrame) {
      frame = nextFrame
      return draw()
    },
    resize: draw,
  }
}
