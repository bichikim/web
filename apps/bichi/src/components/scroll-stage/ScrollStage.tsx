import * as THREE from 'three'
import {onCleanup, onMount} from 'solid-js'
import vertexShader from '../../shaders/vertex.glsl?raw'
import fragmentShader from '../../shaders/fragment.glsl?raw'

/** Clamp value between min and max (GSAP.utils.clamp equivalent). */
function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Linear interpolation (GSAP.utils.interpolate equivalent). */
function lerp(current: number, target: number, ease: number): number {
  return current + (target - current) * ease
}

export interface ScrollStageProps {
  /** Ref to the .content element that contains .scroll__content and .layout__line */
  contentRef: () => HTMLElement | undefined
}

const EASE = 0.05
const SOFT_THRESHOLD = 0.01
const CAMERA_FOV = 75
const CAMERA_NEAR = 0.1
const CAMERA_FAR = 10
const CAMERA_Z = 2.5
const ICOSAHEDRON_DETAIL = 64
const ROTATION_SPEED = 0.05
const MOBILE_SCALE = 0.75
const PIXEL_RATIO_MAX = 1.5
const EASE_MULTIPLIER = 2

const SETTINGS = {
  uAmplitude: {end: 4, start: 4},
  uDeepPurple: {end: 0, start: 1},
  uDensity: {end: 1, start: 1},
  uFrequency: {end: 4, start: 0},
  uOpacity: {end: 0.66, start: 0.1},
  uStrength: {end: 1.1, start: 0},
} as const

export function ScrollStage(props: ScrollStageProps) {
  onMount(() => {
    const contentElement = props.contentRef()

    if (!contentElement) {
      return
    }

    const scrollContent = contentElement.querySelector<HTMLElement>('.scroll__content')
    const lineElement_ = contentElement.querySelector<HTMLElement>('.layout__line')

    if (!scrollContent || !lineElement_) {
      return
    }
    const scrollContentElement = scrollContent
    const lineElement = lineElement_

    let viewport = {height: window.innerHeight, width: window.innerWidth}

    const scroll = {
      hard: 0,
      height: 0,
      limit: 0,
      normalized: 0,
      running: false,
      soft: 0,
    }

    const currentUniforms: Record<string, number> = {
      uAmplitude: SETTINGS.uAmplitude.start,
      uDeepPurple: SETTINGS.uDeepPurple.start,
      uDensity: SETTINGS.uDensity.start,
      uFrequency: SETTINGS.uFrequency.start,
      uOpacity: SETTINGS.uOpacity.start,
      uStrength: SETTINGS.uStrength.start,
    }

    function setSizes() {
      scroll.height = scrollContentElement.getBoundingClientRect().height
      scroll.limit = scrollContentElement.clientHeight - viewport.height
      document.body.style.height = `${scroll.height}px`
    }

    const scene = new THREE.Scene()

    scene.background = new THREE.Color(0x00_00_00)
    const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
    const canvas = renderer.domElement

    canvas.classList.add('webgl')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none'
    document.body.insertBefore(canvas, document.body.firstChild)

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, viewport.width / viewport.height, CAMERA_NEAR, CAMERA_FAR)

    camera.position.set(0, 0, CAMERA_Z)
    scene.add(camera)

    const geometry = new THREE.IcosahedronGeometry(1, ICOSAHEDRON_DETAIL)

    const material = new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending,
      fragmentShader,
      transparent: true,
      uniforms: {
        uAmplitude: {value: SETTINGS.uAmplitude.start},
        uDeepPurple: {value: SETTINGS.uDeepPurple.start},
        uDensity: {value: SETTINGS.uDensity.start},
        uFrequency: {value: SETTINGS.uFrequency.start},
        uOpacity: {value: SETTINGS.uOpacity.start},
        uStrength: {value: SETTINGS.uStrength.start},
      },
      vertexShader,
      wireframe: true,
    })
    const mesh = new THREE.Mesh(geometry, material)

    scene.add(mesh)

    const clock = new THREE.Clock()
    let rafId: number

    function updateScrollValues() {
      scroll.hard = clamp(0, scroll.limit, window.scrollY)
      scroll.soft = lerp(scroll.soft, scroll.hard, EASE)

      if (scroll.soft < SOFT_THRESHOLD) {
        scroll.soft = 0
      }

      scroll.normalized = scroll.limit > 0 ? scroll.soft / scroll.limit : 0
      scrollContentElement.style.transform = `translateY(${-scroll.soft}px)`
      mesh.rotation.x = scroll.normalized * Math.PI
      lineElement.style.transform = `scaleX(${scroll.normalized})`
      lineElement.style.transformOrigin = 'left'

      for (const key of Object.keys(SETTINGS) as (keyof typeof SETTINGS)[]) {
        const setting = SETTINGS[key]

        const target = setting.start + scroll.normalized * (setting.end - setting.start)

        currentUniforms[key] = lerp(currentUniforms[key], target, EASE * EASE_MULTIPLIER)
        ;(material.uniforms[key] as THREE.IUniform<number>).value = currentUniforms[key]
      }
    }

    function update() {
      const elapsed = clock.getElapsedTime()

      mesh.rotation.y = elapsed * ROTATION_SPEED
      updateScrollValues()
      renderer.render(scene, camera)
      rafId = requestAnimationFrame(update)
    }

    function onResize() {
      viewport = {height: window.innerHeight, width: window.innerWidth}
      setSizes()

      if (viewport.width < viewport.height) {
        mesh.scale.set(MOBILE_SCALE, MOBILE_SCALE, MOBILE_SCALE)
      } else {
        mesh.scale.set(1, 1, 1)
      }

      camera.aspect = viewport.width / viewport.height
      camera.updateProjectionMatrix()
      renderer.setSize(viewport.width, viewport.height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_MAX))
    }

    function onScroll() {
      if (!scroll.running) {
        scroll.running = true

        requestAnimationFrame(() => {
          scroll.running = false
        })
      }
    }

    setSizes()
    onResize()
    window.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onResize)
    rafId = requestAnimationFrame(update)

    onCleanup(() => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      renderer.forceContextLoss()
      renderer.dispose()

      if (canvas.parentNode) {
        canvas.remove()
      }
    })
  })

  return null
}
