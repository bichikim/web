import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three'

import type {PuppetDocument, PuppetSceneDeformerNode, PuppetSpatialMesh} from '../../player'
import {
  createSpatialPreviewEdgeIndices,
  createSpatialPreviewGeometry,
  getSpatialPreviewMesh,
  type SpatialPreviewGeometry,
} from './spatial-preview-geometry'

export interface SpatialThreeOverlay {
  destroy(): void
  prepare(): void
  render(): void
  update(surface: SpatialThreeSurface | undefined): void
}

export interface SpatialThreeSurface {
  readonly document: PuppetDocument
  readonly node: PuppetSceneDeformerNode
}

const getSurfaceStyle = (canvas: HTMLCanvasElement, name: string) =>
  getComputedStyle(canvas).getPropertyValue(name).trim()
const COORDINATES = 3

const configureCamera = (camera: OrthographicCamera, geometry: SpatialPreviewGeometry) => {
  camera.left = geometry.viewBox.x
  camera.right = geometry.viewBox.x + geometry.viewBox.width
  camera.top = -geometry.viewBox.y
  camera.bottom = -(geometry.viewBox.y + geometry.viewBox.height)
  let minimum = Infinity
  let maximum = -Infinity
  for (let index = 2; index < geometry.positions.length; index += COORDINATES) {
    const depth = geometry.positions[index]!
    minimum = Math.min(minimum, depth)
    maximum = Math.max(maximum, depth)
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return false
  }
  const span = Math.max(1, maximum - minimum)
  camera.position.set(0, 0, maximum + span + 1)
  camera.near = 0.1
  camera.far = 2 * span + 2
  camera.updateProjectionMatrix()
  return true
}

/** Renders the editor's 3D control surface into the Pixi-owned WebGL canvas. */
export const createSpatialThreeOverlay = (canvas: HTMLCanvasElement): SpatialThreeOverlay => {
  const context = canvas.getContext('webgl2')
  if (context === null) {
    throw new Error('3D 메시 표시는 WebGL 2가 필요합니다.')
  }
  const renderer = new WebGLRenderer({canvas, context})
  renderer.autoClear = false
  // Pixi clears this shared canvas; keep its transparent background when Three initializes.
  renderer.setClearAlpha(0)
  const scene = new Scene()
  const camera = new OrthographicCamera()
  const faceMaterial = new MeshLambertMaterial({
    color: new Color(getSurfaceStyle(canvas, '--spatial-mesh-face')),
    flatShading: true,
    opacity: Number(getSurfaceStyle(canvas, '--spatial-mesh-opacity')),
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: DoubleSide,
    transparent: true,
  })
  const edgeMaterial = new LineBasicMaterial({
    color: new Color(getSurfaceStyle(canvas, '--spatial-mesh-edge')),
  })
  const lightColor = new Color(getSurfaceStyle(canvas, '--spatial-mesh-light'))
  const ambient = new AmbientLight(
    lightColor,
    Number(getSurfaceStyle(canvas, '--spatial-mesh-ambient')),
  )
  const directional = new DirectionalLight(
    lightColor,
    Number(getSurfaceStyle(canvas, '--spatial-mesh-directional')),
  )
  directional.position.set(-1, 1, 2)
  scene.add(ambient, directional)
  let faces: Mesh<BufferGeometry, MeshLambertMaterial> | undefined
  let edges: LineSegments<BufferGeometry, LineBasicMaterial> | undefined
  let sourceMesh: PuppetSpatialMesh | undefined
  let previewMesh: PuppetSpatialMesh | undefined
  let width = 0
  let height = 0

  const clearSurface = () => {
    if (faces !== undefined) {
      scene.remove(faces)
      faces.geometry.dispose()
      faces = undefined
    }
    if (edges !== undefined) {
      scene.remove(edges)
      edges.geometry.dispose()
      edges = undefined
    }
  }

  const updateGeometry = (geometry: SpatialPreviewGeometry) => {
    if (faces === undefined || edges === undefined) {
      const faceGeometry = new BufferGeometry()
      faceGeometry.setAttribute('position', new BufferAttribute(geometry.positions, COORDINATES))
      faceGeometry.setIndex(new BufferAttribute(geometry.indices, 1))
      const edgeGeometry = new BufferGeometry()
      edgeGeometry.setAttribute(
        'position',
        new BufferAttribute(new Float32Array(geometry.positions), COORDINATES),
      )
      edgeGeometry.setIndex(
        new BufferAttribute(
          createSpatialPreviewEdgeIndices(
            geometry.positions,
            geometry.indices,
            Number(getSurfaceStyle(canvas, '--spatial-mesh-edge-angle')),
          ),
          1,
        ),
      )
      faces = new Mesh(faceGeometry, faceMaterial)
      edges = new LineSegments(edgeGeometry, edgeMaterial)
      scene.add(faces, edges)
      return
    }
    const facePositions = faces.geometry.getAttribute('position') as BufferAttribute
    const edgePositions = edges.geometry.getAttribute('position') as BufferAttribute
    facePositions.copyArray(geometry.positions)
    edgePositions.copyArray(geometry.positions)
    facePositions.needsUpdate = true
    edgePositions.needsUpdate = true
  }

  return {
    destroy() {
      clearSurface()
      faceMaterial.dispose()
      edgeMaterial.dispose()
      renderer.dispose()
    },
    prepare() {
      const {width: nextWidth, height: nextHeight} = canvas
      if (width === nextWidth && height === nextHeight) {
        return
      }
      width = nextWidth
      height = nextHeight
      renderer.setSize(width, height, false)
    },
    render() {
      if (faces === undefined || edges === undefined) {
        return
      }
      renderer.resetState()
      renderer.clearDepth()
      renderer.render(scene, camera)
    },
    update(surface) {
      const mesh = surface?.node.spatialMesh
      if (surface === undefined || mesh === undefined) {
        clearSurface()
        return
      }
      if (mesh !== sourceMesh) {
        sourceMesh = mesh
        previewMesh = getSpatialPreviewMesh(mesh)
        clearSurface()
      }
      const geometry = createSpatialPreviewGeometry({
        document: surface.document,
        mesh: previewMesh ?? mesh,
        node: surface.node,
      })
      updateGeometry(geometry)
      if (!configureCamera(camera, geometry)) {
        clearSurface()
      }
    },
  }
}
