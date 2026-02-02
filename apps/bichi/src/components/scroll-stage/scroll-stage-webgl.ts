import type {
  BufferGeometry,
  Clock,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderer,
} from 'three'
import fragmentShader from '../../shaders/fragment.glsl?raw'
import vertexShader from '../../shaders/vertex.glsl?raw'
import particleFragmentShader from '../../shaders/particle-fragment.glsl?raw'
import particleVertexShader from '../../shaders/particle-vertex.glsl?raw'
import {
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_Z,
  ICOSAHEDRON_DETAIL,
  MOBILE_SCALE,
  PARTICLE_COUNT,
  PARTICLE_POINT_SIZE,
  PARTICLE_SPHERE_RADIUS,
  PIXEL_RATIO_MAX,
} from './scroll-stage-settings'
import {createMaterialUniforms} from './scroll-stage-uniforms'
import type {Viewport} from './scroll-stage-scroll'

/** 3D text mesh behind the glass object (for refraction verification) */
export interface TextMeshRef {
  geometry: BufferGeometry
  material: MeshBasicMaterial
  mesh: Mesh
  updateText: (text: string) => void
}

export interface WebglStage {
  camera: PerspectiveCamera
  canvas: HTMLCanvasElement
  clock: Clock
  dispose: () => void
  geometry: IcosahedronGeometry
  material: ShaderMaterial
  mesh: Mesh
  render: () => void
  renderer: WebGLRenderer
  resize: (viewport: Viewport) => void
  scene: Scene
  setScrollNormalized: (n: number) => void
  setText: (text: string) => void
  textMesh: TextMeshRef | null
  updateScale: (viewport: Viewport) => void
}

export interface WebglStageOptions {
  canvas?: HTMLCanvasElement
}

const TEXT_PLANE_HEIGHT = 1.4
const TEXT_PLANE_WIDTH = 5.5
/** Clear color for FBO pass so refraction background is light, not black (#e5e7eb gray-200) */
const FBO_CLEAR_COLOR = 15_066_539
const TEXT_PLANE_Z = -1.5
const TEXT_SIZE = 384
const TEXT_CANVAS_HEIGHT_MULTIPLIER = 2
const TEXT_SIZE_MULTIPLIER = 4
const TEXT_FONT = 'bold 200px system-ui, sans-serif'

/** Gradient stop positions for CD-like iridescence */
const TEXT_GRADIENT_T1 = 0.35
const TEXT_GRADIENT_T2 = 0.65

/** Gradient stops for 3D title text: slate-700, indigo-600, violet-600, indigo-500 (CD-like iridescence) */
const TEXT_GRADIENT_STOPS: [number, string][] = [
  [0, '#334155'],
  [TEXT_GRADIENT_T1, '#4f46e5'],
  [TEXT_GRADIENT_T2, '#7c3aed'],
  [1, '#6366f1'],
]

/** Default 3D text when no section is centered */
const DEFAULT_TEXT = 'hello world!'

/**
 * Creates a Points mesh with time/scroll-driven drift (floating particles).
 * Fragment uses cosPalette for iridescent color like the glass object.
 */
function createParticles(THREE: typeof import('three')): {
  geometry: BufferGeometry
  material: ShaderMaterial
  points: Points
} {
  const itemSize = 3
  const zOffset = 0.5
  const positions = new Float32Array(PARTICLE_COUNT * itemSize)
  const seeds = new Float32Array(PARTICLE_COUNT)
  const radius = PARTICLE_SPHERE_RADIUS

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const uNorm = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const r = Math.sqrt(1 - uNorm * uNorm) * radius

    positions[index * itemSize] = r * Math.cos(theta)
    positions[index * itemSize + 1] = uNorm * radius
    positions[index * itemSize + 2] = r * Math.sin(theta) - zOffset
    seeds[index] = Math.random()
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, itemSize))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

  const material = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: particleFragmentShader,
    transparent: true,
    uniforms: {
      uPointSize: {value: PARTICLE_POINT_SIZE},
      uScrollNormalized: {value: 0},
      uTime: {value: 0},
    },
    vertexShader: particleVertexShader,
  })

  const points = new THREE.Points(geometry, material)

  points.frustumCulled = false

  return {geometry, material, points}
}

/**
 * Creates a 3D plane with text drawn via canvas texture (no FontLoader).
 * Positioned behind the glass mesh for refraction verification.
 * Text uses a linear gradient (slate → indigo → violet) for CD-like iridescence.
 * updateText() redraws the canvas so the 3D text can switch to section titles (About, Work, Contact).
 */
function createTextPlane(THREE: typeof import('three')): TextMeshRef | null {
  const canvas = document.createElement('canvas')

  canvas.width = TEXT_SIZE * TEXT_SIZE_MULTIPLIER
  canvas.height = TEXT_SIZE * TEXT_CANVAS_HEIGHT_MULTIPLIER

  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  const texture = new THREE.CanvasTexture(canvas)

  const drawText = (text: string) => {
    context.clearRect(0, 0, canvas.width, canvas.height)

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)

    for (const [t, color] of TEXT_GRADIENT_STOPS) {
      gradient.addColorStop(t, color)
    }

    context.fillStyle = gradient
    context.font = TEXT_FONT
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text || DEFAULT_TEXT, canvas.width / 2, canvas.height / 2)
    texture.needsUpdate = true
  }

  drawText(DEFAULT_TEXT)

  const geometry = new THREE.PlaneGeometry(TEXT_PLANE_WIDTH, TEXT_PLANE_HEIGHT)

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    opacity: 0.95,
    side: THREE.DoubleSide,
    transparent: true,
  })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(0, 0, TEXT_PLANE_Z)

  return {
    geometry,
    material,
    mesh,
    updateText: drawText,
  }
}

export async function createWebglStage(viewport: Viewport, options: WebglStageOptions = {}): Promise<WebglStage> {
  const THREE = await import('three')
  const scene = new THREE.Scene()

  scene.background = null

  const renderer = new THREE.WebGLRenderer(
    options.canvas
      ? {alpha: true, antialias: true, canvas: options.canvas, premultipliedAlpha: false}
      : {alpha: true, antialias: true, premultipliedAlpha: false},
  )
  const canvas = renderer.domElement

  renderer.setClearColor(0x00_00_00, 0)
  canvas.classList.add('webgl')
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none'

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, viewport.width / viewport.height, CAMERA_NEAR, CAMERA_FAR)

  camera.position.set(0, 0, CAMERA_Z)
  scene.add(camera)

  const geometry = new THREE.IcosahedronGeometry(1, ICOSAHEDRON_DETAIL)

  /** FBO for refraction: scene (text) rendered without glass mesh, then sampled in shader */
  const renderTarget = new THREE.WebGLRenderTarget(viewport.width, viewport.height, {
    depthBuffer: true,
    format: THREE.RGBAFormat,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    type: THREE.UnsignedByteType,
  })

  const baseUniforms = createMaterialUniforms()

  const material = new THREE.ShaderMaterial({
    blending: THREE.NormalBlending,
    depthWrite: false,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {
      ...baseUniforms,
      uBuffer: {value: null as Texture | null},
      uBufferSize: {value: new THREE.Vector2(viewport.width, viewport.height)},
      uIOR: {value: 1.2},
      uProjectionMatrix: {value: camera.projectionMatrix},
    },
    vertexShader,
    wireframe: false,
  })
  const mesh = new THREE.Mesh(geometry, material)

  scene.add(mesh)

  const clock = new THREE.Clock()

  /** 3D text behind the glass – drawn with canvas texture (no FontLoader) */
  const textMeshRef = createTextPlane(THREE)

  if (textMeshRef) {
    scene.add(textMeshRef.mesh)
  }

  /** Floating particles reacting to scroll */
  const {geometry: particleGeometry, material: particleMaterial, points: particlePoints} = createParticles(THREE)

  scene.add(particlePoints)

  let scrollNormalized = 0

  const setScrollNormalized = (value: number) => {
    scrollNormalized = value
  }

  const render = () => {
    const uniforms = material.uniforms as typeof material.uniforms & {
      uBuffer: {value: Texture | null}
      uBufferSize: {value: Vector2}
    }

    const elapsed = clock.getElapsedTime()
    const particleUniforms = particleMaterial.uniforms as Record<string, {value: number}>

    particleUniforms.uTime.value = elapsed
    particleUniforms.uScrollNormalized.value = scrollNormalized
    mesh.visible = false
    renderer.setRenderTarget(renderTarget)
    renderer.setClearColor(FBO_CLEAR_COLOR, 1)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.setClearColor(0x00_00_00, 0)
    mesh.visible = true
    uniforms.uBuffer.value = renderTarget.texture
    renderer.setRenderTarget(null)
    renderer.render(scene, camera)
  }

  const resize = (nextViewport: Viewport) => {
    camera.aspect = nextViewport.width / nextViewport.height
    camera.updateProjectionMatrix()
    renderer.setSize(nextViewport.width, nextViewport.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_MAX))
    renderTarget.setSize(nextViewport.width, nextViewport.height)
    const uniforms = material.uniforms as typeof material.uniforms & {uBufferSize: {value: Vector2}}

    uniforms.uBufferSize.value.set(nextViewport.width, nextViewport.height)
  }

  const updateScale = (nextViewport: Viewport) => {
    const scale = nextViewport.width < nextViewport.height ? MOBILE_SCALE : 1

    mesh.scale.set(scale, scale, scale)

    if (textMeshRef) {
      textMeshRef.mesh.scale.set(scale, scale, scale)
    }
  }

  const setText = (text: string) => {
    textMeshRef?.updateText(text)
  }

  const dispose = () => {
    geometry.dispose()
    material.dispose()
    particleGeometry.dispose()
    particleMaterial.dispose()
    renderTarget.dispose()

    if (textMeshRef) {
      textMeshRef.geometry.dispose()
      textMeshRef.material.dispose()
    }

    renderer.forceContextLoss()
    renderer.dispose()
  }

  return {
    camera,
    canvas,
    clock,
    dispose,
    geometry,
    material,
    mesh,
    render,
    renderer,
    resize,
    scene,
    setScrollNormalized,
    setText,
    textMesh: textMeshRef,
    updateScale,
  }
}
