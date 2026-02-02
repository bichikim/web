import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createWebglStage} from '../scroll-stage-webgl'
import {MOBILE_SCALE} from '../scroll-stage-settings'

vi.mock('three', () => {
  class Scene {
    background: unknown
    add = vi.fn()
  }

  class WebGLRenderer {
    domElement = document.createElement('canvas')
    render = vi.fn()
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    forceContextLoss = vi.fn()
    dispose = vi.fn()
  }

  class PerspectiveCamera {
    aspect: number
    position = {set: vi.fn()}
    updateProjectionMatrix = vi.fn()

    constructor(_fov: number, aspect: number) {
      this.aspect = aspect
    }
  }

  class IcosahedronGeometry {
    dispose = vi.fn()
  }

  class ShaderMaterial {
    uniforms: Record<string, unknown>
    dispose = vi.fn()

    constructor(options: {uniforms: Record<string, unknown>}) {
      this.uniforms = options.uniforms
    }
  }

  class Mesh {
    rotation = {x: 0, y: 0}
    scale = {set: vi.fn()}
  }

  class Color {}

  class Clock {
    getElapsedTime = vi.fn(() => 0)
  }

  return {
    AdditiveBlending: 'AdditiveBlending',
    Clock,
    Color,
    IcosahedronGeometry,
    Mesh,
    PerspectiveCamera,
    Scene,
    ShaderMaterial,
    WebGLRenderer,
  }
})

describe('scroll-stage-webgl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a stage with styled canvas', () => {
    const stage = createWebglStage({height: 600, width: 800})

    expect(stage.canvas.classList.contains('webgl')).toBe(true)
    expect(stage.canvas.style.cssText).toContain('position:fixed')
  })

  it('resizes renderer and camera', () => {
    const stage = createWebglStage({height: 600, width: 800})
    const setSize = stage.renderer.setSize as unknown as ReturnType<typeof vi.fn>
    const setPixelRatio = stage.renderer.setPixelRatio as unknown as ReturnType<typeof vi.fn>
    const updateProjectionMatrix = stage.camera.updateProjectionMatrix as unknown as ReturnType<typeof vi.fn>

    stage.resize({height: 500, width: 1000})
    expect(setSize).toHaveBeenCalledWith(1000, 500)
    expect(setPixelRatio).toHaveBeenCalled()
    expect(updateProjectionMatrix).toHaveBeenCalled()
    expect(stage.camera.aspect).toBe(2)
  })

  it('updates mesh scale based on viewport', () => {
    const stage = createWebglStage({height: 600, width: 800})
    const scaleSet = stage.mesh.scale.set as unknown as ReturnType<typeof vi.fn>

    stage.updateScale({height: 700, width: 320})
    stage.updateScale({height: 600, width: 900})
    expect(scaleSet).toHaveBeenNthCalledWith(1, MOBILE_SCALE, MOBILE_SCALE, MOBILE_SCALE)
    expect(scaleSet).toHaveBeenNthCalledWith(2, 1, 1, 1)
  })

  it('disposes renderer resources', () => {
    const stage = createWebglStage({height: 600, width: 800})
    const disposeGeometry = stage.geometry.dispose as unknown as ReturnType<typeof vi.fn>
    const disposeMaterial = stage.material.dispose as unknown as ReturnType<typeof vi.fn>
    const forceContextLoss = stage.renderer.forceContextLoss as unknown as ReturnType<typeof vi.fn>
    const disposeRenderer = stage.renderer.dispose as unknown as ReturnType<typeof vi.fn>

    stage.dispose()
    expect(disposeGeometry).toHaveBeenCalled()
    expect(disposeMaterial).toHaveBeenCalled()
    expect(forceContextLoss).toHaveBeenCalled()
    expect(disposeRenderer).toHaveBeenCalled()
  })
})
