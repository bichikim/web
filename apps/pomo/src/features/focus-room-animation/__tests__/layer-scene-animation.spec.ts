import {Container, Sprite, Ticker} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {positionLayerContainer, validateTextureSizes} from '../layer-layout'
import {createLayerMaskFilter} from '../layer-mask'
import {applyLoopingTranslation} from '../looping-translation'
import {getLayerMotions, getMotionEffects} from '../motion-definition'
import {resetMotionPresentation} from '../motion-reset'
import {validateSceneMotions} from '../motion-validation'
import {getMotionTarget, getNextMotionTarget} from '../motion-targets'
import {applyOpacityPulse} from '../opacity-pulse'
import {
  advanceSpriteOpacityTwinkle,
  applyOpacityTwinkle,
  createOpacityTwinkleState,
} from '../opacity-twinkle'
import {createPushFilter, createPushFilters} from '../push-filter-factory'
import {acquireTextureGroup, releaseTextureGroup} from '../texture-leases'
import {applyVisibilityCycle} from '../visibility-cycle'
import {
  createStaticLayerScene,
  PixiLayerScene,
  type PixiLayerSceneDefinition,
  type PixiLayerSceneState,
  type PixiSceneMotion,
} from '../layer-scene'

vi.mock('pixi.js', () => ({
  Container: vi.fn(),
  Sprite: vi.fn(),
  Ticker: vi.fn(),
}))

vi.mock('../layer-layout', () => ({
  positionLayerContainer: vi.fn(),
  validateTextureSizes: vi.fn(),
}))

vi.mock('../layer-mask', () => ({createLayerMaskFilter: vi.fn()}))
vi.mock('../looping-translation', () => ({applyLoopingTranslation: vi.fn()}))
vi.mock('../motion-definition', () => ({
  getLayerMotions: vi.fn(),
  getMotionEffects: vi.fn(),
}))
vi.mock('../motion-reset', () => ({resetMotionPresentation: vi.fn()}))
vi.mock('../motion-validation', () => ({validateSceneMotions: vi.fn()}))
vi.mock('../motion-targets', () => ({
  getMotionTarget: vi.fn(),
  getNextMotionTarget: vi.fn(),
}))
vi.mock('../opacity-pulse', () => ({applyOpacityPulse: vi.fn()}))
vi.mock('../opacity-twinkle', () => ({
  advanceSpriteOpacityTwinkle: vi.fn(),
  applyOpacityTwinkle: vi.fn(),
  createOpacityTwinkleState: vi.fn(),
}))
vi.mock('../push-filter-factory', () => ({
  createPushFilter: vi.fn(),
  createPushFilters: vi.fn(),
}))
vi.mock('../texture-leases', () => ({
  acquireTextureGroup: vi.fn(),
  releaseTextureGroup: vi.fn(),
}))
vi.mock('../visibility-cycle', () => ({applyVisibilityCycle: vi.fn()}))

interface MockContainer {
  addChild: ReturnType<typeof vi.fn>
  alpha: number
  children: unknown[]
  destroy: ReturnType<typeof vi.fn>
  filters: unknown
  parent: MockContainer | null
  position: {set: ReturnType<typeof vi.fn>}
  rotation: number
  visible: boolean
}

interface MockSprite {
  alpha: number
  filters: unknown
  texture: unknown
}

interface MockTicker {
  add: ReturnType<typeof vi.fn>
  callback: ((ticker: {deltaMS: number}) => void) | null
  destroy: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

const containers: MockContainer[] = []
const sprites: MockSprite[] = []
const tickers: MockTicker[] = []

const createContainer = (): MockContainer => {
  const container: MockContainer = {
    addChild: vi.fn((child: {parent?: MockContainer | null}) => {
      container.children.push(child)
      child.parent = container
      return child
    }),
    alpha: 1,
    children: [],
    destroy: vi.fn(),
    filters: null,
    parent: null,
    position: {set: vi.fn()},
    rotation: 0,
    visible: true,
  }
  containers.push(container)
  return container
}

const createTicker = (): MockTicker => {
  const ticker: MockTicker = {
    add: vi.fn((callback: (ticker: {deltaMS: number}) => void) => {
      ticker.callback = callback
    }),
    callback: null,
    destroy: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  tickers.push(ticker)
  return ticker
}

const createDefinition = (
  overrides: Partial<PixiLayerSceneDefinition> = {},
): PixiLayerSceneDefinition => ({
  background: '#fff',
  height: 100,
  id: 'scene',
  layers: [{id: 'base', source: '/base.webp'}],
  width: 200,
  ...overrides,
})

const enabledState: PixiLayerSceneState = {animationEnabled: true}

const translation = (overrides: Partial<PixiSceneMotion> = {}): PixiSceneMotion =>
  ({
    distance: {x: 10, y: 5},
    kind: 'translation',
    transitionSeconds: 0.5,
    travel: {maximumSeconds: 1, minimumSeconds: 1},
    ...overrides,
  }) as PixiSceneMotion

const createLease = (source: string) => ({
  source,
  texture: {height: 100, source, width: 200},
})

beforeEach(() => {
  containers.length = 0
  sprites.length = 0
  tickers.length = 0

  vi.mocked(Container).mockImplementation(function MockContainerConstructor() {
    return createContainer() as never
  })
  vi.mocked(Sprite).mockImplementation(function MockSpriteConstructor(texture) {
    const sprite: MockSprite = {alpha: 1, filters: null, texture}
    sprites.push(sprite)
    return sprite as never
  })
  vi.mocked(Ticker).mockImplementation(function MockTickerConstructor() {
    return createTicker() as never
  })
  vi.mocked(acquireTextureGroup).mockImplementation(
    async (sources) => sources.map(createLease) as never,
  )
  vi.mocked(getLayerMotions).mockImplementation(
    (layer) => layer.motions ?? (layer.motion === undefined ? [] : [layer.motion]),
  )
  vi.mocked(getMotionEffects).mockReturnValue([])
  vi.mocked(createPushFilters).mockReturnValue([])
  vi.mocked(createLayerMaskFilter).mockReturnValue(null)
  vi.mocked(getMotionTarget).mockImplementation((_motion, direction) => ({
    x: direction,
    y: direction * 2,
  }))
  vi.mocked(getNextMotionTarget).mockImplementation((_motion, _current, direction) => ({
    x: direction * 3,
    y: direction * 4,
  }))
  vi.mocked(createOpacityTwinkleState).mockReturnValue({} as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PixiLayerScene animation', () => {
  it('should advance translations, pivot rotations, opacity, and pixel push effects', async () => {
    const filter = {destroy: vi.fn(), setProgress: vi.fn()}
    vi.mocked(createPushFilters).mockReturnValue([filter] as never)
    const motions: PixiSceneMotion[] = [
      translation(),
      translation({targets: [{x: 1, y: 2}]} as never),
      {
        center: {x: 0, y: 0},
        degrees: 90,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 1, minimumSeconds: 1},
      },
      {
        kind: 'opacity-pulse',
        maximumOpacity: 1,
        minimumOpacity: 0,
        travel: {maximumSeconds: 1, minimumSeconds: 1},
      },
      {
        effects: [],
        kind: 'pixel-oscillation',
        travel: {maximumSeconds: 1, minimumSeconds: 1},
      },
    ]
    const scene = new PixiLayerScene(
      createDefinition({layers: [{id: 'base', motions, source: '/base.webp'}]}),
      {onRender: vi.fn(), random: () => 0.5},
    )
    await scene.initialize(enabledState)
    vi.clearAllMocks()

    tickers[0].callback?.({deltaMS: 1000})

    expect(containers[1].position.set).toHaveBeenCalled()
    expect(containers[1].rotation).toBeCloseTo(Math.PI / 2)
    expect(applyOpacityPulse).toHaveBeenCalled()
    expect(filter.setProgress).toHaveBeenCalled()
    expect(getNextMotionTarget).toHaveBeenCalled()
    expect(getMotionTarget).toHaveBeenCalled()

    tickers[0].callback?.({deltaMS: 250})
    expect(containers[1].position.set).toHaveBeenCalled()
    tickers[0].callback?.({deltaMS: 1000})
    expect(getMotionTarget).toHaveBeenCalledWith(expect.anything(), 1)
  })

  it('should advance looping, visibility, and twinkle motions and restart completed periods', async () => {
    const motions: PixiSceneMotion[] = [
      {
        from: {x: 0, y: 0},
        kind: 'looping-translation',
        phase: 0.5,
        to: {x: 10, y: 0},
        travel: {maximumSeconds: 1, minimumSeconds: 1},
      },
      {
        kind: 'visibility-cycle',
        phase: 0.5,
        travel: {maximumSeconds: 1, minimumSeconds: 1},
        visibleFraction: 0.5,
      },
      {
        fall: {maximumSeconds: 1, minimumSeconds: 1},
        flashChance: 0,
        flashFall: {maximumSeconds: 1, minimumSeconds: 1},
        flashHold: {maximumSeconds: 1, minimumSeconds: 1},
        flashRise: {maximumSeconds: 1, minimumSeconds: 1},
        kind: 'opacity-twinkle',
        maximumOpacity: 1,
        minimumOpacity: 0,
        rise: {maximumSeconds: 1, minimumSeconds: 1},
        travel: {maximumSeconds: 1, minimumSeconds: 1},
      },
    ]
    const scene = new PixiLayerScene(
      createDefinition({layers: [{id: 'base', motions, source: '/base.webp'}]}),
      {onRender: vi.fn(), random: () => 0},
    )
    await scene.initialize(enabledState)
    vi.clearAllMocks()

    tickers[0].callback?.({deltaMS: 500})

    expect(applyLoopingTranslation).toHaveBeenCalledWith(containers[1], sprites[0], motions[0], 1)
    expect(applyVisibilityCycle).toHaveBeenCalledWith(sprites[0], motions[1], 0)
    expect(advanceSpriteOpacityTwinkle).toHaveBeenCalledWith(
      expect.objectContaining({deltaSeconds: 0.5, motion: motions[2], sprite: sprites[0]}),
    )

    tickers[0].callback?.({deltaMS: 250})
    expect(applyLoopingTranslation).toHaveBeenLastCalledWith(
      containers[1],
      sprites[0],
      motions[0],
      0.25,
    )
    expect(applyVisibilityCycle).toHaveBeenLastCalledWith(sprites[0], motions[1], 0.25)
  })

  it('should skip disabled motions and tolerate changing motion discriminants', async () => {
    let visibilityKinds: string[] | null = null
    let loopingKinds: string[] | null = null
    const visibilityMotion = {
      get kind() {
        return visibilityKinds?.shift() ?? 'visibility-cycle'
      },
      travel: {maximumSeconds: 1, minimumSeconds: 1},
      visibleFraction: 0.5,
    } as PixiSceneMotion
    const loopingMotion = {
      from: {x: 0, y: 0},
      get kind() {
        return loopingKinds?.shift() ?? 'looping-translation'
      },
      to: {x: 1, y: 1},
      travel: {maximumSeconds: 1, minimumSeconds: 1},
    } as PixiSceneMotion
    const scene = new PixiLayerScene(
      createDefinition({
        layers: [
          {
            channel: 'layer',
            id: 'base',
            motions: [visibilityMotion, loopingMotion],
            source: '/base.webp',
          },
        ],
      }),
      {onRender: vi.fn()},
    )
    await scene.initialize(enabledState)

    scene.update({
      animationEnabled: true,
      channels: {layer: {visible: false}},
    })
    vi.clearAllMocks()
    tickers[0].callback?.({deltaMS: 100})
    expect(applyVisibilityCycle).not.toHaveBeenCalled()
    expect(applyLoopingTranslation).not.toHaveBeenCalled()

    scene.update(enabledState)
    visibilityKinds = ['other', 'visibility-cycle', 'other']
    loopingKinds = ['other', 'other', 'looping-translation', 'other']
    tickers[0].callback?.({deltaMS: 100})

    expect(applyVisibilityCycle).not.toHaveBeenCalled()
    expect(applyLoopingTranslation).not.toHaveBeenCalled()
  })

  it('should reset twinkle presentation and filter progress when animation stops', async () => {
    const filter = {destroy: vi.fn(), setProgress: vi.fn()}
    vi.mocked(createPushFilters).mockReturnValue([filter] as never)
    const motion: PixiSceneMotion = {
      fall: {maximumSeconds: 1, minimumSeconds: 1},
      flashChance: 0,
      flashFall: {maximumSeconds: 1, minimumSeconds: 1},
      flashHold: {maximumSeconds: 1, minimumSeconds: 1},
      flashRise: {maximumSeconds: 1, minimumSeconds: 1},
      kind: 'opacity-twinkle',
      maximumOpacity: 1,
      minimumOpacity: 0,
      rise: {maximumSeconds: 1, minimumSeconds: 1},
      travel: {maximumSeconds: 2, minimumSeconds: 1},
    }
    const scene = new PixiLayerScene(
      createDefinition({layers: [{id: 'base', motion, source: '/base.webp'}]}),
      {onRender: vi.fn(), random: () => 0.5},
    )
    await scene.initialize(enabledState)
    vi.clearAllMocks()

    scene.setAnimationEnabled(false)

    expect(resetMotionPresentation).toHaveBeenCalled()
    expect(createOpacityTwinkleState).toHaveBeenCalledWith(motion, expect.any(Function))
    expect(applyOpacityTwinkle).toHaveBeenCalledWith(sprites[0], expect.any(Object))
    expect(filter.setProgress).toHaveBeenCalledWith(0)
  })
})
