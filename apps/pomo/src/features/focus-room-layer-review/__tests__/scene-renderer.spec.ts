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
    resolvers: new Map<string, Resolve>(),
    scenes: [] as Array<{container: TestContainer; definitionId: string; destroyed: boolean}>,
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
    readonly setSceneReady = vi.fn()
    readonly update = vi.fn()
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
}))

vi.mock('../../focus-room-animation/scene-layer-state', () => ({
  createFocusRoomLayerState: () => ({channels: {}}),
}))

import {PLayerReviewRenderer, type PLayerReviewState} from '../scene-renderer'

const state: PLayerReviewState = {
  activity: 'reading',
  animationEnabled: true,
  eyesVisible: true,
  gaze: 'focused',
  handsVisible: true,
  headVisible: true,
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
