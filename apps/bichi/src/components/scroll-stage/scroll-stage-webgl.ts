import * as THREE from 'three'

import fragmentShader from '../../shaders/fragment.glsl?raw'
import vertexShader from '../../shaders/vertex.glsl?raw'
import {
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_Z,
  ICOSAHEDRON_DETAIL,
  MOBILE_SCALE,
  PIXEL_RATIO_MAX,
} from './scroll-stage-settings'
import {createMaterialUniforms} from './scroll-stage-uniforms'
import type {Viewport} from './scroll-stage-scroll'

export interface WebglStage {
  camera: THREE.PerspectiveCamera
  canvas: HTMLCanvasElement
  clock: THREE.Clock
  geometry: THREE.IcosahedronGeometry
  material: THREE.ShaderMaterial
  mesh: THREE.Mesh
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  dispose: () => void
  render: () => void
  resize: (viewport: Viewport) => void
  updateScale: (viewport: Viewport) => void
}

export function createWebglStage(viewport: Viewport): WebglStage {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x00_00_00)
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
  const canvas = renderer.domElement

  canvas.classList.add('webgl')
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none'

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, viewport.width / viewport.height, CAMERA_NEAR, CAMERA_FAR)

  camera.position.set(0, 0, CAMERA_Z)
  scene.add(camera)

  const geometry = new THREE.IcosahedronGeometry(1, ICOSAHEDRON_DETAIL)

  const material = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    fragmentShader,
    transparent: true,
    uniforms: createMaterialUniforms(),
    vertexShader,
    wireframe: true,
  })
  const mesh = new THREE.Mesh(geometry, material)

  scene.add(mesh)

  const clock = new THREE.Clock()

  const render = () => {
    renderer.render(scene, camera)
  }

  const resize = (nextViewport: Viewport) => {
    camera.aspect = nextViewport.width / nextViewport.height
    camera.updateProjectionMatrix()
    renderer.setSize(nextViewport.width, nextViewport.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_MAX))
  }

  const updateScale = (nextViewport: Viewport) => {
    if (nextViewport.width < nextViewport.height) {
      mesh.scale.set(MOBILE_SCALE, MOBILE_SCALE, MOBILE_SCALE)
      return
    }

    mesh.scale.set(1, 1, 1)
  }

  const dispose = () => {
    geometry.dispose()
    material.dispose()
    renderer.forceContextLoss()
    renderer.dispose()
  }

  return {camera, canvas, clock, geometry, material, mesh, renderer, scene, dispose, render, resize, updateScale}
}
