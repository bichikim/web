import {Application, Container, Sprite} from 'pixi.js'
import {vi} from 'vitest'

import {DepthParallaxFilter} from '../../depth-parallax-filter'
import {PEyeController} from '../../eye-animation-controller'
import {PixiLayerScene} from '../../layer-scene'
import {ParallaxController} from '../../parallax-controller'
import {createSceneTransitions} from '../../scene-composite-transition'
import {getPScenePanPosition} from '../../scene-motion'
import {SceneLoadingState} from '../../scene-loading-state'
import {createPSceneMouthController} from '../../scene-mouth-controller'
import {PSceneSteamController} from '../../scene-steam-controller'
import {acquireTextureGroup} from '../../texture-leases'

interface MockContainer {
  addChild: ReturnType<typeof vi.fn>
  children: unknown[]
  destroy: ReturnType<typeof vi.fn>
  filters: unknown
  parent: MockContainer | null
  removeFromParent: ReturnType<typeof vi.fn>
}

interface MockApplication {
  canvas: HTMLCanvasElement
  destroy: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
  stage: MockContainer
}

interface MockEyes {
  container: MockContainer
  destroy: ReturnType<typeof vi.fn>
  initialize: ReturnType<typeof vi.fn>
  setSceneReady: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

interface MockLayerScene {
  container: MockContainer
  destroy: ReturnType<typeof vi.fn>
  getAttachment: ReturnType<typeof vi.fn>
  initialize: ReturnType<typeof vi.fn>
  setAnimationEnabled: ReturnType<typeof vi.fn>
}

interface MockLoading {
  destroy: ReturnType<typeof vi.fn>
  finish: ReturnType<typeof vi.fn>
  finishAfterPaint: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockMouth {
  destroy: ReturnType<typeof vi.fn>
  getLayerState: ReturnType<typeof vi.fn>
  setReducedMotion: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

interface MockParallax {
  destroy: ReturnType<typeof vi.fn>
  prefersReducedMotion: boolean
  setInputMode: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockSteam {
  destroy: ReturnType<typeof vi.fn>
  ensure: ReturnType<typeof vi.fn>
  setParallaxOffset: ReturnType<typeof vi.fn>
  setReducedMotion: ReturnType<typeof vi.fn>
  setSceneStyle: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockTransitions {
  cancelDepthTransition?: ReturnType<typeof vi.fn>
  capture: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  setProgress: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockDepthFilter {
  cancelDepthTransition: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  finishDepthTransition: ReturnType<typeof vi.fn>
  setDepthMix: ReturnType<typeof vi.fn>
  setDepthTransition: ReturnType<typeof vi.fn>
  setPointerOffset: ReturnType<typeof vi.fn>
}

interface RendererCallbacks {
  eyesRender: (() => void) | undefined
  getLayerScenes: (() => readonly unknown[]) | undefined
  layerRender: (() => void) | undefined
  parallaxRender: ((x: number, y: number) => void) | undefined
  readReducedMotion: (() => boolean) | undefined
  reducedMotionChange: ((prefersReducedMotion: boolean) => void) | undefined
  steamRender: (() => void) | undefined
}

export interface RendererMocks {
  readonly applications: ReadonlyArray<MockApplication>
  /** 생성자에서 받은 최신 콜백을 호출 직전에 읽어 지역 함수로 실행한다. */
  readonly callbacks: RendererCallbacks
  readonly containers: ReadonlyArray<MockContainer>
  readonly createApplication: () => MockApplication
  readonly createContainer: () => MockContainer
  readonly createLayerScene: () => MockLayerScene
  readonly depthFilters: ReadonlyArray<MockDepthFilter>
  readonly eyesInstances: ReadonlyArray<MockEyes>
  readonly frameCallbacks: ReadonlyMap<number, FrameRequestCallback>
  /** 인스턴스·콜백·프레임을 초기화하고 기본 대역을 설치한다. 기록 정리와 전역 복구는 명세가 맡는다. */
  readonly install: () => void
  readonly layerScenes: ReadonlyArray<MockLayerScene>
  readonly loadings: ReadonlyArray<MockLoading>
  readonly mouths: ReadonlyArray<MockMouth>
  readonly parallaxInstances: ReadonlyArray<MockParallax>
  readonly steamInstances: ReadonlyArray<MockSteam>
  readonly transitionInstances: ReadonlyArray<MockTransitions>
}

const createLease = (source: string) => ({source, texture: {source}})

interface RendererRegistries {
  readonly applications: MockApplication[]
  readonly containers: MockContainer[]
  readonly depthFilters: MockDepthFilter[]
  readonly eyesInstances: MockEyes[]
  readonly layerScenes: MockLayerScene[]
  readonly loadings: MockLoading[]
  readonly mouths: MockMouth[]
  readonly steamInstances: MockSteam[]
  readonly transitionInstances: MockTransitions[]
}

interface RendererFactories {
  readonly createApplication: () => MockApplication
  readonly createContainer: () => MockContainer
  readonly createDepthFilter: () => MockDepthFilter
  readonly createEyes: () => MockEyes
  readonly createLayerScene: () => MockLayerScene
  readonly createLoading: () => MockLoading
  readonly createMouth: () => MockMouth
  readonly createSteam: () => MockSteam
  readonly createTransitions: () => MockTransitions
}

const createRendererFactories = (registries: RendererRegistries): RendererFactories => {
  const createContainer = (): MockContainer => {
    const container: MockContainer = {
      addChild: vi.fn((child: {parent?: MockContainer | null}) => {
        container.children.push(child)
        child.parent = container
        return child
      }),
      children: [],
      destroy: vi.fn(),
      filters: null,
      parent: null,
      removeFromParent: vi.fn(() => {
        container.parent = null
      }),
    }
    registries.containers.push(container)
    return container
  }

  const createApplication = (): MockApplication => {
    const canvas = document.createElement('canvas')
    const destroy = vi.fn()
    const init = vi.fn().mockResolvedValue(undefined)
    const render = vi.fn()
    const stage = createContainer()
    const application: MockApplication = {
      canvas,
      destroy,
      init,
      render,
      stage,
    }
    registries.applications.push(application)
    return application
  }

  const createEyes = (): MockEyes => {
    const container = createContainer()
    const eyes: MockEyes = {
      container,
      destroy: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      setSceneReady: vi.fn(),
      update: vi.fn(),
    }
    registries.eyesInstances.push(eyes)
    return eyes
  }

  const createLayerScene = (): MockLayerScene => {
    const container = createContainer()
    const scene: MockLayerScene = {
      container,
      destroy: vi.fn(),
      getAttachment: vi.fn().mockReturnValue(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      setAnimationEnabled: vi.fn(),
    }
    registries.layerScenes.push(scene)
    return scene
  }

  const createLoading = (): MockLoading => {
    const loading: MockLoading = {
      destroy: vi.fn(),
      finish: vi.fn(),
      finishAfterPaint: vi.fn(),
      start: vi.fn(),
    }
    registries.loadings.push(loading)
    return loading
  }

  const createMouth = (): MockMouth => {
    const mouth: MockMouth = {
      destroy: vi.fn(),
      getLayerState: vi.fn().mockReturnValue({animationEnabled: true}),
      setReducedMotion: vi.fn(),
      update: vi.fn(),
    }
    registries.mouths.push(mouth)
    return mouth
  }

  const createSteam = (): MockSteam => {
    const steam: MockSteam = {
      destroy: vi.fn(),
      ensure: vi.fn().mockResolvedValue(undefined),
      setParallaxOffset: vi.fn(),
      setReducedMotion: vi.fn(),
      setSceneStyle: vi.fn(),
      start: vi.fn(),
    }
    registries.steamInstances.push(steam)
    return steam
  }

  const createTransitions = (): MockTransitions => {
    const transitions: MockTransitions = {
      capture: vi.fn(),
      destroy: vi.fn(),
      restore: vi.fn(),
      setProgress: vi.fn(),
      start: vi.fn(),
    }
    registries.transitionInstances.push(transitions)
    return transitions
  }

  const createDepthFilter = (): MockDepthFilter => {
    const filter: MockDepthFilter = {
      cancelDepthTransition: vi.fn(),
      destroy: vi.fn(),
      finishDepthTransition: vi.fn(),
      setDepthMix: vi.fn(),
      setDepthTransition: vi.fn(),
      setPointerOffset: vi.fn(),
    }
    registries.depthFilters.push(filter)
    return filter
  }

  return {
    createApplication,
    createContainer,
    createDepthFilter,
    createEyes,
    createLayerScene,
    createLoading,
    createMouth,
    createSteam,
    createTransitions,
  }
}

/** 각 명세가 독립적으로 생성하고 install로 초기화하는 렌더러 대역 그래프를 반환한다. */
export const createRendererMocks = (): RendererMocks => {
  const applications: MockApplication[] = []
  const containers: MockContainer[] = []
  const depthFilters: MockDepthFilter[] = []
  const eyesInstances: MockEyes[] = []
  const layerScenes: MockLayerScene[] = []
  const loadings: MockLoading[] = []
  const mouths: MockMouth[] = []
  const parallaxInstances: MockParallax[] = []
  const steamInstances: MockSteam[] = []
  const transitionInstances: MockTransitions[] = []
  const callbacks: RendererCallbacks = {
    eyesRender: undefined,
    getLayerScenes: undefined,
    layerRender: undefined,
    parallaxRender: undefined,
    readReducedMotion: undefined,
    reducedMotionChange: undefined,
    steamRender: undefined,
  }
  let nextFrameId = 1
  const frameCallbacks = new Map<number, FrameRequestCallback>()

  const {
    createApplication,
    createContainer,
    createDepthFilter,
    createEyes,
    createLayerScene,
    createLoading,
    createMouth,
    createSteam,
    createTransitions,
  } = createRendererFactories({
    applications,
    containers,
    depthFilters,
    eyesInstances,
    layerScenes,
    loadings,
    mouths,
    steamInstances,
    transitionInstances,
  })

  const install = () => {
    applications.length = 0
    containers.length = 0
    depthFilters.length = 0
    eyesInstances.length = 0
    frameCallbacks.clear()
    layerScenes.length = 0
    loadings.length = 0
    mouths.length = 0
    nextFrameId = 1
    parallaxInstances.length = 0
    steamInstances.length = 0
    transitionInstances.length = 0
    callbacks.layerRender = undefined
    callbacks.getLayerScenes = undefined
    callbacks.eyesRender = undefined
    callbacks.parallaxRender = undefined
    callbacks.reducedMotionChange = undefined
    callbacks.readReducedMotion = undefined
    callbacks.steamRender = undefined

    vi.mocked(Application).mockImplementation(function MockApplicationConstructor() {
      return createApplication() as never
    })
    vi.mocked(Container).mockImplementation(function MockContainerConstructor() {
      return createContainer() as never
    })
    vi.mocked(Sprite).mockImplementation(function MockSpriteConstructor(texture) {
      const sprite = createContainer() as MockContainer & {texture: unknown}
      sprite.texture = texture
      return sprite as never
    })
    vi.mocked(DepthParallaxFilter).mockImplementation(function MockDepthFilterConstructor() {
      return createDepthFilter() as never
    })
    vi.mocked(PEyeController).mockImplementation(function MockEyesConstructor(onRender) {
      callbacks.eyesRender = onRender
      return createEyes() as never
    })
    vi.mocked(PixiLayerScene).mockImplementation(
      function MockLayerSceneConstructor(_definition, options) {
        callbacks.layerRender = options?.onRender
        return createLayerScene() as never
      },
    )
    vi.mocked(ParallaxController).mockImplementation(
      function MockParallaxConstructor(_host, render, options) {
        callbacks.parallaxRender = render
        callbacks.reducedMotionChange = options?.onMotionPreferenceChange
        const parallax: MockParallax = {
          destroy: vi.fn(),
          prefersReducedMotion: false,
          setInputMode: vi.fn(),
          start: vi.fn(),
        }
        parallaxInstances.push(parallax)
        return parallax as never
      },
    )
    vi.mocked(createSceneTransitions).mockImplementation(() => createTransitions() as never)
    const PAN_CENTER = 60
    const PAN_OFFSET = 10
    vi.mocked(getPScenePanPosition).mockImplementation((value) => PAN_CENTER + value * PAN_OFFSET)
    vi.mocked(SceneLoadingState).mockImplementation(function MockLoadingConstructor() {
      return createLoading() as never
    })
    vi.mocked(createPSceneMouthController).mockImplementation((getScenes) => {
      callbacks.getLayerScenes = getScenes
      return createMouth() as never
    })
    vi.mocked(PSceneSteamController).mockImplementation(function MockSteamConstructor(options) {
      callbacks.readReducedMotion = options.getPrefersReducedMotion
      callbacks.steamRender = options.onRender
      return createSteam() as never
    })
    vi.mocked(acquireTextureGroup).mockImplementation(
      async (sources) => sources.map(createLease) as never,
    )
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      frameCallbacks.set(frameId, callback)
      return frameId
    })
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((frameId) => {
      frameCallbacks.delete(frameId)
    })
    vi.stubGlobal('reportError', vi.fn())
  }

  return {
    applications,
    callbacks,
    containers,
    createApplication,
    createContainer,
    createLayerScene,
    depthFilters,
    eyesInstances,
    frameCallbacks,
    install,
    layerScenes,
    loadings,
    mouths,
    parallaxInstances,
    steamInstances,
    transitionInstances,
  }
}
