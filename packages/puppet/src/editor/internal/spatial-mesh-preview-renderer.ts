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
  MeshLambertMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

import type {PuppetSpatialMesh} from '../../player'

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
}

export interface SpatialMeshPreviewRenderer {
  destroy(): void
  pick(clientX: number, clientY: number): string | undefined
  render(frame: SpatialMeshPreviewFrame): void
  resize(): void
}

interface Surface {
  readonly edges: LineSegments<BufferGeometry, LineBasicMaterial>
  readonly faces: Mesh<BufferGeometry, MeshLambertMaterial>
  readonly id?: string
}

const COORDINATES = 3
const VIEW_MARGIN = 1.15
const CAMERA_FAR_RADIUS = 8
const CAMERA_DISTANCE_RADIUS = 3
const DEGREES_PER_CIRCLE = 180
const LIGHT_DEPTH = 3
const getStyle = (canvas: HTMLCanvasElement, name: string) =>
  getComputedStyle(canvas).getPropertyValue(name).trim()

const getMeshBounds = (mesh: PuppetSpatialMesh) => {
  const minimum = [Infinity, Infinity, Infinity]
  const maximum = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < mesh.vertices.length; index += 1) {
    const axis = index % COORDINATES
    minimum[axis] = Math.min(minimum[axis]!, mesh.vertices[index]!)
    maximum[axis] = Math.max(maximum[axis]!, mesh.vertices[index]!)
  }
  const center = new Vector3(
    (minimum[0]! + maximum[0]!) / 2,
    -(minimum[1]! + maximum[1]!) / 2,
    (minimum[2]! + maximum[2]!) / 2,
  )
  const radius = Math.max(
    1,
    Math.hypot(maximum[0]! - center.x, maximum[1]! + center.y, maximum[2]! - center.z) *
      VIEW_MARGIN,
  )
  return {center, radius}
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
    }),
  )
  const edges = new LineSegments(
    new EdgesGeometry(geometry, Number(getStyle(canvas, '--spatial-preview-edge-angle'))),
    new LineBasicMaterial({color: new Color(getStyle(canvas, '--spatial-preview-edge'))}),
  )
  return {edges, faces, id: range.id}
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
  const faceColor = new Color(getStyle(canvas, '--spatial-preview-face'))
  const mutedColor = new Color(getStyle(canvas, '--spatial-preview-muted'))
  let sourceMesh: SpatialPreviewMesh | undefined
  let frame: SpatialMeshPreviewFrame | undefined
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

  const updateCamera = (mesh: SpatialPreviewMesh, orbit: SpatialPreviewOrbit) => {
    const {center, radius} = getMeshBounds(mesh)
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
    for (const surface of surfaces) {
      surface.faces.material.color.copy(
        surface.id !== undefined && frame.mutedIds.has(surface.id) ? mutedColor : faceColor,
      )
    }
    if (frame.mesh !== undefined) {
      updateCamera(frame.mesh, frame.orbit)
    }
    renderer.render(scene, camera)
  }

  return {
    destroy() {
      clearSurfaces()
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
      draw()
    },
    resize: draw,
  }
}
