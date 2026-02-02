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
    setClearColor = vi.fn()
    setPixelRatio = vi.fn()
    setRenderTarget = vi.fn()
    setSize = vi.fn()
    clear = vi.fn()
    forceContextLoss = vi.fn()
    dispose = vi.fn()
  }

  class WebGLRenderTarget {
    texture = {}
    setSize = vi.fn()
    dispose = vi.fn()
    constructor(_w: number, _h: number, _options?: Record<string, unknown>) {}
  }

  class Vector2 {
    x: number
    y: number
    set = vi.fn()
    constructor(x = 0, y = 0) {
      this.x = x
      this.y = y
    }
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

  class BufferAttribute {
    constructor(
      _array: BufferSource,
      public itemSize: number,
    ) {}
  }

  class BufferGeometry {
    setAttribute = vi.fn()
    dispose = vi.fn()
  }

  class Mesh {
    position = {set: vi.fn()}
    rotation = {x: 0, y: 0}
    scale = {set: vi.fn()}
    visible = true
  }

  class Points {
    frustumCulled = true
  }

  class Vector3 {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0,
    ) {}
  }

  class CanvasTexture {
    needsUpdate = false
    constructor(_canvas: HTMLCanvasElement) {}
  }

  class PlaneGeometry {
    dispose = vi.fn()
    constructor(_width: number, _height: number) {}
  }

  class MeshBasicMaterial {
    dispose = vi.fn()
    constructor(_options: Record<string, unknown>) {}
  }

  class Color {}

  class Clock {
    getElapsedTime = vi.fn(() => 0)
  }

  return {
    AdditiveBlending: 'AdditiveBlending',
    BufferAttribute,
    BufferGeometry,
    CanvasTexture,
    Clock,
    Color,
    DoubleSide: 'DoubleSide',
    IcosahedronGeometry,
    LinearFilter: 'LinearFilter',
    Mesh,
    MeshBasicMaterial,
    NormalBlending: 'NormalBlending',
    PerspectiveCamera,
    PlaneGeometry,
    Points,
    RGBAFormat: 'RGBAFormat',
    Scene,
    ShaderMaterial,
    UnsignedByteType: 'UnsignedByteType',
    Vector2,
    Vector3,
    WebGLRenderTarget,
    WebGLRenderer,
  }
})

describe('scroll-stage-webgl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // JSDOM does not implement canvas.getContext; mock so createTextPlane does not throw
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
      if (contextId !== '2d') return null
      return {
        clearRect: vi.fn(),
        createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        fillText: vi.fn(),
      }
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext
  })

  it('creates a stage with styled canvas', async () => {
    const stage = await createWebglStage({height: 600, width: 800})

    expect(stage.canvas.classList.contains('webgl')).toBe(true)
    expect(stage.canvas.style.cssText).toContain('position: fixed')
  })

  it('resizes renderer and camera', async () => {
    const stage = await createWebglStage({height: 600, width: 800})
    const setSize = stage.renderer.setSize as unknown as ReturnType<typeof vi.fn>
    const setPixelRatio = stage.renderer.setPixelRatio as unknown as ReturnType<typeof vi.fn>
    const updateProjectionMatrix = stage.camera.updateProjectionMatrix as unknown as ReturnType<typeof vi.fn>

    stage.resize({height: 500, width: 1000})
    expect(setSize).toHaveBeenCalledWith(1000, 500)
    expect(setPixelRatio).toHaveBeenCalled()
    expect(updateProjectionMatrix).toHaveBeenCalled()
    expect(stage.camera.aspect).toBe(2)
  })

  it('updates mesh scale based on viewport', async () => {
    const stage = await createWebglStage({height: 600, width: 800})
    const scaleSet = stage.mesh.scale.set as unknown as ReturnType<typeof vi.fn>

    stage.updateScale({height: 700, width: 320})
    stage.updateScale({height: 600, width: 900})
    expect(scaleSet).toHaveBeenNthCalledWith(1, MOBILE_SCALE, MOBILE_SCALE, MOBILE_SCALE)
    expect(scaleSet).toHaveBeenNthCalledWith(2, 1, 1, 1)
  })

  it('disposes renderer resources', async () => {
    const stage = await createWebglStage({height: 600, width: 800})
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
