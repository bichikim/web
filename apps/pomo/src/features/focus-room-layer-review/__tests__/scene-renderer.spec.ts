/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

const rendererHarness = vi.hoisted(() => {
  type Resolve = () => void

  interface TestContainer {
    addChild: (child: TestContainer) => void
    children: TestContainer[]
    destroy: () => void
    destroyed: boolean
    parent: TestContainer | null
    removeFromParent: () => void
  }

  const createContainer = (): TestContainer => {
    const container: TestContainer = {
      addChild(child) {
        child.removeFromParent()
        this.children.push(child)
        child.parent = this
      },
      children: [],
      destroy() {
        this.destroyed = true
        this.removeFromParent()
      },
      destroyed: false,
      parent: null,
      removeFromParent() {
        const parent = this.parent

        if (parent !== null) {
          parent.children = parent.children.filter((child) => child !== this)
          this.parent = null
        }
      },
    }

    return container
  }

  return {
    applicationResolver: null as null | Resolve,
    applications: [] as Array<{canvas: HTMLCanvasElement; stage: TestContainer}>,
    createContainer,
    deferApplication: false,
    eyes: [] as Array<{setMode: (mode: string) => void}>,
    resolvers: new Map<string, Resolve>(),
    scenes: [] as Array<{
      container: TestContainer
      definitionId: string
      destroyed: boolean
      update: ReturnType<typeof vi.fn>
    }>,
  }
})

vi.mock('pixi.js', () => ({
  Application: class ApplicationMock {
    readonly canvas = document.createElement('canvas')
    readonly stage = rendererHarness.createContainer()

    constructor() {
      rendererHarness.applications.push(this)
    }

    readonly destroy = vi.fn(() => this.canvas.remove())
    readonly init = vi.fn(() =>
      rendererHarness.deferApplication
        ? new Promise<void>((resolve) => {
            rendererHarness.applicationResolver = resolve
          })
        : Promise.resolve(),
    )
    readonly render = vi.fn()
  },
}))

vi.mock('../../focus-room-animation/eye-animation-controller', () => ({
  PEyeController: class PEyeControllerMock {
    readonly container = rendererHarness.createContainer()
    readonly destroy = vi.fn(() => this.container.destroy())
    readonly initialize = vi.fn(async () => undefined)
    readonly setMode = vi.fn()
    readonly setSceneReady = vi.fn()
    readonly update = vi.fn()

    constructor() {
      rendererHarness.eyes.push(this)
    }
  },
}))

vi.mock('../../focus-room-animation/layer-scene', () => ({
  PixiLayerScene: class PixiLayerSceneMock {
    readonly container = rendererHarness.createContainer()
    readonly definitionId: string
    destroyed = false

    constructor(definition: {readonly id: string}) {
      this.definitionId = definition.id
      rendererHarness.scenes.push(this)
    }

    readonly destroy = vi.fn(() => {
      this.destroyed = true
      this.container.destroy()
    })
    readonly getAttachment = vi.fn(() => null)
    readonly initialize = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          rendererHarness.resolvers.set(this.definitionId, resolve)
        }),
    )
    readonly update = vi.fn()
  },
}))

vi.mock('../../focus-room-animation/scene-catalog', () => ({
  FOCUS_ROOM_PREVIEW_CHANNELS: {
    eyes: 'eyes',
    hands: 'hands',
    head: 'head',
    reference: 'reference',
  },
}))

vi.mock('../../focus-room-animation/scene-catalog-channels', () => ({
  FOCUS_ROOM_MOUTH_CHANNELS: {
    closed: 'mouth-closed',
    narrow: 'mouth-narrow',
    open: 'mouth-open',
    rest: 'mouth-rest',
    round: 'mouth-round',
    wide: 'mouth-wide',
  },
  FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS: {
    'closed-round-early': 'mouth-transition-closed-round-early',
    'closed-round-late': 'mouth-transition-closed-round-late',
    'closed-wide-early': 'mouth-transition-closed-wide-early',
    'closed-wide-late': 'mouth-transition-closed-wide-late',
    'half-open': 'mouth-transition-half-open',
    'narrow-round-early': 'mouth-transition-narrow-round-early',
    'narrow-round-late': 'mouth-transition-narrow-round-late',
    'narrow-round-middle': 'mouth-transition-narrow-round-middle',
    'narrow-wide-early': 'mouth-transition-narrow-wide-early',
    'narrow-wide-late': 'mouth-transition-narrow-wide-late',
    'narrow-wide-middle': 'mouth-transition-narrow-wide-middle',
    'open-round-early': 'mouth-transition-open-round-early',
    'open-round-late': 'mouth-transition-open-round-late',
    'open-round-middle': 'mouth-transition-open-round-middle',
    'open-wide-early': 'mouth-transition-open-wide-early',
    'open-wide-late': 'mouth-transition-open-wide-late',
    release: 'mouth-transition-release',
    'small-open': 'mouth-transition-small-open',
  },
}))

vi.mock('../../focus-room-animation/scene-layer-state', () => ({
  createFocusRoomLayerState: vi.fn(() => ({channels: {}})),
}))

import {createFocusRoomLayerState} from '../../focus-room-animation/scene-layer-state'
import {PLayerReviewRenderer, type PLayerReviewState} from '../scene-renderer'

const state: PLayerReviewState = {
  activity: 'reading',
  animationEnabled: true,
  eyeMode: 'auto',
  eyesVisible: true,
  gaze: 'focused',
  handsVisible: true,
  headVisible: true,
  mouthFrame: null,
  mouthPositionComparison: false,
  mouthVisible: true,
  referenceOpacity: 0,
  time: 'day',
  viseme: 'rest',
}

const createDefinition = (id: string) => ({
  background: '#000',
  height: 100,
  id,
  layers: [],
  width: 100,
})

beforeEach(() => {
  rendererHarness.applicationResolver = null
  rendererHarness.applications.length = 0
  rendererHarness.deferApplication = false
  rendererHarness.eyes.length = 0
  rendererHarness.resolvers.clear()
  rendererHarness.scenes.length = 0
})

it('should initialize only the latest preview selected before Pixi is ready', async () => {
  rendererHarness.deferApplication = true
  const host = document.createElement('div')
  const renderer = new PLayerReviewRenderer(host, {definition: createDefinition('initial')})
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.applicationResolver).not.toBeNull())
  await renderer.replaceDefinition(createDefinition('replacement'))
  rendererHarness.applicationResolver?.()
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('replacement')).toBe(true))
  rendererHarness.resolvers.get('replacement')?.()
  await initialization

  expect(rendererHarness.scenes.map((scene) => scene.definitionId)).toEqual(['replacement'])
  expect(host.querySelector('canvas')).not.toBeNull()
  renderer.destroy()
})

it('should keep the latest preview when it loads before the initial scene', async () => {
  const host = document.createElement('div')
  const renderer = new PLayerReviewRenderer(host, {definition: createDefinition('initial')})
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))

  const replacement = renderer.replaceDefinition(createDefinition('replacement'))
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('replacement')).toBe(true))
  rendererHarness.resolvers.get('replacement')?.()
  await replacement
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  const initialScene = rendererHarness.scenes.find((scene) => scene.definitionId === 'initial')
  const replacementScene = rendererHarness.scenes.find(
    (scene) => scene.definitionId === 'replacement',
  )
  const stage = rendererHarness.applications[0]?.stage

  expect(initialScene?.destroyed).toBe(true)
  expect(replacementScene?.destroyed).toBe(false)
  expect(stage?.children).toContain(replacementScene?.container)
  expect(stage?.children).not.toContain(initialScene?.container)
  expect(host.querySelector('canvas')).not.toBeNull()
  renderer.destroy()
})

it('should forward a fixed eye frame to the eye controller', async () => {
  const host = document.createElement('div')
  const renderer = new PLayerReviewRenderer(host, {definition: createDefinition('initial')})
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  renderer.update({...state, eyeMode: 'closed'})

  expect(rendererHarness.eyes[0]?.setMode).toHaveBeenLastCalledWith('closed')
  renderer.destroy()
})

it('should animate from the previous mouth shape when the review selection changes', async () => {
  const host = document.createElement('div')
  const renderer = new PLayerReviewRenderer(host, {definition: createDefinition('initial')})
  const initialization = renderer.initialize({...state, viseme: 'closed'})
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  renderer.update({...state, viseme: 'open'})

  expect(createFocusRoomLayerState).toHaveBeenLastCalledWith('open', false, {
    from: 'closed',
    progress: 0,
    to: 'open',
  })
  renderer.destroy()
})

it('should show one selected mouth image without running a transition', async () => {
  const host = document.createElement('div')
  const renderer = new PLayerReviewRenderer(host, {definition: createDefinition('initial')})
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  renderer.update({...state, mouthFrame: 'open-round-middle'})

  const scene = rendererHarness.scenes[0]
  const latestSceneState = vi.mocked(scene?.update).mock.lastCall?.[0] as {
    readonly channels: Readonly<
      Record<string, {readonly opacity?: number; readonly visible?: boolean}>
    >
  }

  expect(latestSceneState.channels['mouth-transition-open-round-middle']).toEqual({
    opacity: 1,
    visible: true,
  })
  expect(latestSceneState.channels['mouth-open']?.visible).toBe(false)
  renderer.destroy()
})

it('should overlay the selected mouth at half opacity above the rest mouth for comparison', async () => {
  const host = document.createElement('div')
  const renderer = new PLayerReviewRenderer(host, {definition: createDefinition('initial')})
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  renderer.update({
    ...state,
    mouthFrame: 'open-round-middle',
    mouthPositionComparison: true,
  })

  const scene = rendererHarness.scenes[0]
  const latestSceneState = vi.mocked(scene?.update).mock.lastCall?.[0] as {
    readonly channels: Readonly<
      Record<string, {readonly opacity?: number; readonly visible?: boolean}>
    >
  }

  expect(latestSceneState.channels['mouth-rest']).toEqual({opacity: 1, visible: true})
  expect(latestSceneState.channels['mouth-transition-open-round-middle']).toEqual({
    opacity: 0.5,
    visible: true,
  })
  renderer.destroy()
})
