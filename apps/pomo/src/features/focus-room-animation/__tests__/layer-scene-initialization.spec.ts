import {Container, Sprite, Ticker} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {positionLayerContainer, validateTextureSizes} from '../layer-layout'
import {createLayerMaskFilter, detachLayerMasks} from '../layer-mask'
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
import {createSceneEffects} from '../scene-effect'
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

vi.mock('../layer-mask', () => ({createLayerMaskFilter: vi.fn(), detachLayerMasks: vi.fn()}))
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
vi.mock('../scene-effect', () => ({createSceneEffects: vi.fn()}))
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
  vi.mocked(createSceneEffects).mockReturnValue({
    advance: vi.fn(),
    attachBefore: vi.fn(),
    attachTrailing: vi.fn(),
    destroy: vi.fn(),
    hasMotion: false,
    setAnimationEnabled: vi.fn(),
  })
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

describe('createStaticLayerScene', () => {
  it('should create a single-layer definition from a static source', () => {
    expect(
      createStaticLayerScene({
        background: '#123',
        height: 90,
        id: 'static',
        source: '/scene.webp',
        width: 160,
      }),
    ).toEqual({
      background: '#123',
      height: 90,
      id: 'static',
      layers: [{id: 'scene', source: '/scene.webp'}],
      width: 160,
    })
  })
})

describe('PixiLayerScene initialization', () => {
  it('should stop animation before effects and layers are initialized', () => {
    const onRender = vi.fn()
    const scene = new PixiLayerScene(createDefinition(), {onRender})

    scene.setAnimationEnabled(true)

    expect(tickers[0].stop).toHaveBeenCalledOnce()
    expect(onRender).toHaveBeenCalledOnce()
    scene.destroy()
  })

  it('should report only channels declared by the scene definition', () => {
    const layerScene = new PixiLayerScene(
      createDefinition({
        layers: [
          {channel: 'mouth-open', id: 'mouth', source: '/mouth.webp'},
          {id: 'background', source: '/background.webp'},
        ],
      }),
      {onRender: vi.fn()},
    )

    expect(layerScene.hasChannel('mouth-open')).toBe(true)
    expect(layerScene.hasChannel('mouth-transition-small-open')).toBe(false)
    layerScene.destroy()
  })

  it('should initialize layers, masks, filters, attachments, and channel state', async () => {
    const motion = translation({channel: 'motion'})
    const stateFilter = {destroy: vi.fn(), setProgress: vi.fn()}
    const motionFilter = {destroy: vi.fn(), setProgress: vi.fn()}
    const layerMaskFilter = {destroy: vi.fn()}
    vi.mocked(getMotionEffects).mockReturnValue([
      {
        distance: {x: 1, y: 1},
        kind: 'masked-pixel-push',
        maskSource: '/motion-mask.webp',
      } as never,
    ])
    vi.mocked(createPushFilter).mockReturnValue(stateFilter as never)
    vi.mocked(createPushFilters).mockReturnValue([motionFilter] as never)
    vi.mocked(createLayerMaskFilter).mockImplementation((definition) =>
      definition.maskSource === undefined ? null : (layerMaskFilter as never),
    )
    const definition = createDefinition({
      layers: [
        {
          attachmentId: 'head',
          channel: 'face',
          id: 'head',
          maskSource: '/layer-mask.webp',
          motion,
          opacity: 2,
          source: '/head.webp',
          statePixelPush: {
            channel: 'jaw',
            effect: {
              distance: {x: 1, y: 1},
              kind: 'masked-pixel-push',
              maskSource: '/jaw-mask.webp',
            },
          },
        },
        {
          id: 'eyes',
          parentAttachmentId: 'head',
          source: '/eyes.webp',
          visible: false,
        },
      ],
    })
    const onRender = vi.fn()
    const scene = new PixiLayerScene(definition, {onRender, random: () => 0})

    await scene.initialize({
      animationEnabled: true,
      channels: {
        face: {opacity: -1, visible: true},
        jaw: {pixelPushProgress: 2},
        motion: {visible: false},
      },
    })

    expect(acquireTextureGroup).toHaveBeenCalledWith([
      '/head.webp',
      '/eyes.webp',
      '/layer-mask.webp',
      '/jaw-mask.webp',
      '/motion-mask.webp',
    ])
    expect(validateTextureSizes).toHaveBeenCalledOnce()
    expect(positionLayerContainer).toHaveBeenCalledTimes(2)
    expect(createLayerMaskFilter).toHaveBeenCalledTimes(2)
    expect(sprites[0].filters).toEqual([layerMaskFilter, stateFilter, motionFilter])
    expect(createPushFilter).toHaveBeenCalledOnce()
    expect(scene.getAttachment('head')).toBe(containers[1])
    expect(scene.getAttachment('missing')).toBeNull()
    expect(containers[1].alpha).toBe(0)
    expect(containers[1].visible).toBe(true)
    expect(containers[2].visible).toBe(false)
    expect(containers[1].children).toContain(containers[2])
    expect(stateFilter.setProgress).toHaveBeenCalledWith(1)
    expect(motionFilter.setProgress).toHaveBeenCalledWith(0)
    expect(tickers[0].stop).toHaveBeenCalled()
    expect(onRender).toHaveBeenCalledOnce()

    scene.destroy()
    scene.destroy()
    expect(stateFilter.destroy).toHaveBeenCalledOnce()
    expect(layerMaskFilter.destroy).toHaveBeenCalledOnce()
    expect(detachLayerMasks).toHaveBeenCalledOnce()
    expect(motionFilter.destroy).toHaveBeenCalledOnce()
    expect(tickers[0].destroy).toHaveBeenCalledOnce()
    expect(containers[0].destroy).toHaveBeenCalledWith({children: true})
    expect(releaseTextureGroup).toHaveBeenCalledOnce()
  })

  it('should default state pixel push progress and ignore unmasked motion effects', async () => {
    const stateFilter = {destroy: vi.fn(), setProgress: vi.fn()}
    vi.mocked(createPushFilter).mockReturnValue(stateFilter as never)
    vi.mocked(getMotionEffects).mockReturnValue([
      {
        distance: {x: 1, y: 1},
        featherPixels: 1,
        kind: 'pixel-push',
        region: {height: 1, width: 1, x: 0, y: 0},
      },
    ])
    const scene = new PixiLayerScene(
      createDefinition({
        layers: [
          {
            id: 'base',
            motion: translation(),
            source: '/base.webp',
            statePixelPush: {
              channel: 'jaw',
              effect: {
                distance: {x: 1, y: 1},
                featherPixels: 1,
                kind: 'pixel-push',
                region: {height: 1, width: 1, x: 0, y: 0},
              },
            },
          },
        ],
      }),
      {onRender: vi.fn()},
    )

    await scene.initialize({animationEnabled: false, channels: {jaw: {}}})

    expect(stateFilter.setProgress).toHaveBeenCalledWith(0)
    expect(acquireTextureGroup).toHaveBeenCalledWith(['/base.webp'])
  })

  it('should use defaults and start or stop animation only when state changes', async () => {
    const definition = createDefinition({
      layers: [{id: 'base', motion: translation(), source: '/base.webp'}],
    })
    const onRender = vi.fn()
    const scene = new PixiLayerScene(definition, {onRender})
    await scene.initialize(enabledState)

    expect(containers[1].alpha).toBe(1)
    expect(containers[1].visible).toBe(true)
    expect(tickers[0].start).toHaveBeenCalledOnce()
    const renderCount = onRender.mock.calls.length

    scene.setAnimationEnabled(true)
    expect(onRender).toHaveBeenCalledTimes(renderCount)
    scene.setAnimationEnabled(false)
    expect(tickers[0].stop).toHaveBeenCalled()
    expect(onRender).toHaveBeenCalledTimes(renderCount + 1)
    scene.setAnimationEnabled(true)
    expect(tickers[0].start).toHaveBeenCalledTimes(2)
  })

  it('should stop a ticker when no enabled motion remains', async () => {
    const scene = new PixiLayerScene(
      createDefinition({
        layers: [
          {
            id: 'base',
            motion: translation({channel: 'motion'}),
            source: '/base.webp',
          },
        ],
      }),
      {onRender: vi.fn()},
    )
    await scene.initialize({
      animationEnabled: true,
      channels: {motion: {visible: false}},
    })

    expect(tickers[0].start).not.toHaveBeenCalled()
    expect(tickers[0].stop).toHaveBeenCalled()
  })

  it('should place, animate, disable, and destroy a scene effect', async () => {
    const scene = new PixiLayerScene(
      createDefinition({
        effects: [
          {
            beforeLayerId: 'head',
            id: 'rain',
            kind: 'falling-streaks',
            maskSource: '/window-mask.png',
          },
        ],
        layers: [
          {id: 'base', maskSource: '/window-mask.png', source: '/base.webp'},
          {id: 'head', source: '/head.webp'},
        ],
      }),
      {onRender: vi.fn(), random: () => 0.5},
    )
    const effectContainer = createContainer()
    const effect = {
      advance: vi.fn(),
      attachBefore: vi.fn((layerId: string) => {
        if (layerId === 'head') {
          containers[0].children.push(effectContainer)
          effectContainer.parent = containers[0]
        }
      }),
      attachTrailing: vi.fn(),
      destroy: vi.fn(),
      hasMotion: true,
      setAnimationEnabled: vi.fn(),
    }
    vi.mocked(createSceneEffects).mockReturnValue(effect)

    await scene.initialize(enabledState)

    expect(createSceneEffects).toHaveBeenCalledWith({
      definitions: [
        {
          beforeLayerId: 'head',
          id: 'rain',
          kind: 'falling-streaks',
          maskSource: '/window-mask.png',
        },
      ],
      height: 100,
      maskTextures: expect.any(Map),
      random: expect.any(Function),
      sceneContainer: containers[0],
      width: 200,
    })
    expect(acquireTextureGroup).toHaveBeenCalledWith([
      '/base.webp',
      '/head.webp',
      '/window-mask.png',
    ])
    expect(containers[0].children).toEqual([containers[2], effectContainer, containers[3]])
    expect(effect.setAnimationEnabled).toHaveBeenCalledWith(true)
    expect(tickers[0].start).toHaveBeenCalledOnce()

    tickers[0].callback?.({deltaMS: 500})
    expect(effect.advance).toHaveBeenCalledWith(0.5)

    scene.setAnimationEnabled(false)
    expect(effect.setAnimationEnabled).toHaveBeenLastCalledWith(false)

    scene.destroy()
    expect(effect.destroy).toHaveBeenCalledOnce()
  })

  it.each([
    [
      'Duplicate scene effect id: rain',
      [
        {id: 'rain', kind: 'falling-streaks', maskSource: '/mask.png'},
        {id: 'rain', kind: 'falling-streaks', maskSource: '/mask.png'},
      ],
    ],
    [
      'Missing scene effect layer: missing',
      [
        {
          beforeLayerId: 'missing',
          id: 'rain',
          kind: 'falling-streaks',
          maskSource: '/mask.png',
        },
      ],
    ],
  ])('should reject malformed scene effects: %s', async (message, effects) => {
    const scene = new PixiLayerScene(
      createDefinition({effects: effects as PixiLayerSceneDefinition['effects']}),
      {onRender: vi.fn()},
    )

    await expect(scene.initialize(enabledState)).rejects.toThrow(message)
  })

  it('should reject invalid and repeated initialization', async () => {
    const invalid = new PixiLayerScene(createDefinition({width: 0}), {onRender: vi.fn()})
    await expect(invalid.initialize(enabledState)).rejects.toThrow(
      'Invalid scene dimensions: scene',
    )
    expect(tickers[0].destroy).toHaveBeenCalledOnce()

    const valid = new PixiLayerScene(createDefinition(), {onRender: vi.fn()})
    await valid.initialize(enabledState)
    await expect(valid.initialize(enabledState)).rejects.toThrow(
      'Layer scene can only be initialized once: scene',
    )

    valid.destroy()
    await expect(valid.initialize(enabledState)).rejects.toThrow(
      'Layer scene can only be initialized once: scene',
    )
  })

  it.each([
    [
      'Duplicate layer id: duplicate',
      [
        {id: 'duplicate', source: '/a.webp'},
        {id: 'duplicate', source: '/b.webp'},
      ],
    ],
    ['Empty layer attachment id: empty', [{attachmentId: '', id: 'empty', source: '/a.webp'}]],
    [
      'Duplicate layer attachment: shared',
      [
        {attachmentId: 'shared', id: 'a', source: '/a.webp'},
        {attachmentId: 'shared', id: 'b', source: '/b.webp'},
      ],
    ],
    [
      'Layer cannot define both motion and motions: both',
      [{id: 'both', motion: translation(), motions: [translation()], source: '/a.webp'}],
    ],
    [
      'Missing parent layer attachment: absent',
      [{id: 'child', parentAttachmentId: 'absent', source: '/a.webp'}],
    ],
    [
      'Layer cannot define multiple pivot rotations: pivot',
      [
        {
          id: 'pivot',
          motions: [
            {
              center: {x: 0, y: 0},
              degrees: 5,
              kind: 'pivot-rotation',
              travel: {maximumSeconds: 1, minimumSeconds: 1},
            },
            {
              center: {x: 0, y: 0},
              degrees: 10,
              kind: 'pivot-rotation',
              travel: {maximumSeconds: 1, minimumSeconds: 1},
            },
          ],
          source: '/a.webp',
        },
      ],
    ],
  ])('should reject malformed definitions: %s', async (message, layers) => {
    const scene = new PixiLayerScene(
      createDefinition({layers: layers as PixiLayerSceneDefinition['layers']}),
      {onRender: vi.fn()},
    )

    await expect(scene.initialize(enabledState)).rejects.toThrow(message)
    expect(releaseTextureGroup).toHaveBeenCalledWith([])
  })

  it('should release resources when texture acquisition fails or resolves after destruction', async () => {
    vi.mocked(acquireTextureGroup).mockRejectedValueOnce(new Error('load failed'))
    const failed = new PixiLayerScene(createDefinition(), {onRender: vi.fn()})
    await expect(failed.initialize(enabledState)).rejects.toThrow('load failed')
    expect(tickers[0].destroy).toHaveBeenCalledOnce()

    let resolveTextures: ((textures: never) => void) | undefined
    vi.mocked(acquireTextureGroup).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTextures = resolve
        }),
    )
    const destroyed = new PixiLayerScene(createDefinition(), {onRender: vi.fn()})
    const initializing = destroyed.initialize(enabledState)
    destroyed.destroy()
    const textures = [createLease('/base.webp')]
    resolveTextures?.(textures as never)
    await initializing

    expect(releaseTextureGroup).toHaveBeenCalledWith(textures)
    expect(validateTextureSizes).not.toHaveBeenCalled()
  })

  it('should destroy partially created layers when layout setup fails', async () => {
    vi.mocked(positionLayerContainer).mockImplementationOnce(() => {
      throw new Error('layout failed')
    })
    const scene = new PixiLayerScene(createDefinition(), {onRender: vi.fn()})

    await expect(scene.initialize(enabledState)).rejects.toThrow('layout failed')
    expect(containers[0].destroy).toHaveBeenCalledWith({children: true})
    expect(releaseTextureGroup).toHaveBeenCalledOnce()
  })

  it('should destroy completed motion filters when a later filter creation fails', async () => {
    const filter = {destroy: vi.fn(), setProgress: vi.fn()}
    vi.mocked(createPushFilters)
      .mockReturnValueOnce([filter] as never)
      .mockImplementationOnce(() => {
        throw new Error('filter failed')
      })
    const scene = new PixiLayerScene(
      createDefinition({
        layers: [{id: 'base', motions: [translation(), translation()], source: '/base.webp'}],
      }),
      {onRender: vi.fn()},
    )

    await expect(scene.initialize(enabledState)).rejects.toThrow('filter failed')
    expect(filter.destroy).toHaveBeenCalledOnce()
  })
})
