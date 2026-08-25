/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

const rendererHarness = vi.hoisted(() => {
  type Reject = (reason?: unknown) => void
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
    applications: [] as Array<{
      canvas: HTMLCanvasElement
      destroy: ReturnType<typeof vi.fn>
      render: ReturnType<typeof vi.fn>
      stage: TestContainer
    }>,
    createContainer,
    deferApplication: false,
    eyeInitializationError: null as Error | null,
    eyes: [] as Array<{
      onRender: () => void
      setMode: (mode: string) => void
      setSceneReady: (ready: boolean) => void
    }>,
    rejecters: new Map<string, Reject>(),
    resolvers: new Map<string, Resolve>(),
    sceneInitializationErrors: new Map<string, Error>(),
    scenes: [] as Array<{
      container: TestContainer
      definitionId: string
      destroyed: boolean
      onRender: () => void
      update: ReturnType<typeof vi.fn>
    }>,
  }
})

const mouthHarness = vi.hoisted(() => ({onUpdate: null as null | (() => void)}))

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
    readonly initialize = vi.fn(() =>
      rendererHarness.eyeInitializationError === null
        ? Promise.resolve()
        : Promise.reject(rendererHarness.eyeInitializationError),
    )
    readonly setMode = vi.fn()
    readonly setSceneReady = vi.fn()
    readonly update = vi.fn()
    readonly onRender: () => void

    constructor(onRender: () => void) {
      this.onRender = onRender
      rendererHarness.eyes.push(this)
    }
  },
}))

vi.mock('../../focus-room-animation/layer-scene', () => ({
  PixiLayerScene: class PixiLayerSceneMock {
    readonly container = rendererHarness.createContainer()
    readonly definitionId: string
    destroyed = false

    constructor(definition: {readonly id: string}, options: {readonly onRender: () => void}) {
      this.definitionId = definition.id
      this.onRender = options.onRender
      rendererHarness.scenes.push(this)
    }

    readonly destroy = vi.fn(() => {
      this.destroyed = true
      this.container.destroy()
    })
    readonly getAttachment = vi.fn(() => null)
    readonly initialize = vi.fn(() => {
      const error = rendererHarness.sceneInitializationErrors.get(this.definitionId)

      return error === undefined
        ? new Promise<void>((resolve, reject) => {
            rendererHarness.rejecters.set(this.definitionId, reject)
            rendererHarness.resolvers.set(this.definitionId, resolve)
          })
        : Promise.reject(error)
    })
    readonly update = vi.fn()
    readonly onRender: () => void
  },
}))

vi.mock('../../focus-room-animation/mouth-transition-controller', () => ({
  createPMouthTransitionController: vi.fn(),
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
import {createPMouthTransitionController} from '../../focus-room-animation/mouth-transition-controller'
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
  rendererHarness.eyeInitializationError = null
  rendererHarness.eyes.length = 0
  rendererHarness.rejecters.clear()
  rendererHarness.resolvers.clear()
  rendererHarness.sceneInitializationErrors.clear()
  rendererHarness.scenes.length = 0
  mouthHarness.onUpdate = null
  vi.mocked(createPMouthTransitionController).mockImplementation((onUpdate) => {
    let current: {from: string; progress: number; to: string} | null = null
    mouthHarness.onUpdate = onUpdate

    return {
      cancel: () => {
        current = null
        onUpdate()
      },
      get current() {
        return current
      },
      destroy: () => undefined,
      start: (from: string, to: string) => {
        current = {from, progress: 0, to}
        onUpdate()
      },
    } as unknown as ReturnType<typeof createPMouthTransitionController>
  })
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
  const application = rendererHarness.applications[0]
  const renders = application?.render.mock.calls.length ?? 0
  rendererHarness.eyes[0]?.onRender()
  expect(application?.render).toHaveBeenCalledTimes(renders + 1)
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

it('should discard an application that is destroyed while Pixi initializes', async () => {
  rendererHarness.deferApplication = true
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })
  const initialization = renderer.initialize(state)

  await vi.waitFor(() => expect(rendererHarness.applicationResolver).not.toBeNull())
  renderer.destroy()
  rendererHarness.applicationResolver?.()
  await initialization

  expect(rendererHarness.applications[0]?.destroy).toHaveBeenCalledWith(true)
})

it('should destroy the scene when eye initialization fails', async () => {
  const error = new Error('eyes failed')
  rendererHarness.eyeInitializationError = error
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })
  const initialization = renderer.initialize(state)

  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()

  await expect(initialization).rejects.toBe(error)
  expect(rendererHarness.scenes[0]?.destroyed).toBe(true)
})

it('should reject an initial scene error', async () => {
  const initialError = new Error('initial failed')
  rendererHarness.sceneInitializationErrors.set('initial', initialError)
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })

  await expect(renderer.initialize(state)).rejects.toBe(initialError)
  expect(rendererHarness.scenes[0]?.destroyed).toBe(true)
})

it('should ignore replacement requests after destruction and before a state exists', async () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })

  await renderer.replaceDefinition(createDefinition('replacement'))
  renderer.destroy()
  await renderer.replaceDefinition(createDefinition('after-destroy'))
  renderer.destroy()

  expect(rendererHarness.scenes).toHaveLength(0)
})

it('should ignore a mouth-transition update before renderer state exists', () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })

  mouthHarness.onUpdate?.()
  renderer.destroy()
})

it('should use the incoming viseme before initialization creates prior state', () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })

  renderer.update(state)

  expect(createFocusRoomLayerState).toHaveBeenLastCalledWith('rest', false, undefined)
  renderer.destroy()
})

it('should de-duplicate incoming and current replacement definitions', async () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  const replacement = renderer.replaceDefinition(createDefinition('replacement'))
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('replacement')).toBe(true))
  await renderer.replaceDefinition(createDefinition('replacement'))
  rendererHarness.resolvers.get('replacement')?.()
  await replacement
  await renderer.replaceDefinition(createDefinition('replacement'))

  expect(
    rendererHarness.scenes.filter((scene) => scene.definitionId === 'replacement'),
  ).toHaveLength(1)
  renderer.destroy()
})

it('should reset readiness when a current replacement fails', async () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  const error = new Error('replacement failed')
  rendererHarness.sceneInitializationErrors.set('replacement', error)

  await expect(renderer.replaceDefinition(createDefinition('replacement'))).rejects.toBe(error)
  expect(rendererHarness.eyes[0]?.setSceneReady).toHaveBeenLastCalledWith(true)
  renderer.destroy()
})

it('should discard a stale ready replacement and render only while active', async () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  const firstReplacement = renderer.replaceDefinition(createDefinition('replacement-one'))
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('replacement-one')).toBe(true))
  const secondReplacement = renderer.replaceDefinition(createDefinition('replacement-two'))
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('replacement-two')).toBe(true))
  rendererHarness.resolvers.get('replacement-one')?.()
  await firstReplacement
  rendererHarness.resolvers.get('replacement-two')?.()
  await secondReplacement

  const scene = rendererHarness.scenes.find(
    (candidate) => candidate.definitionId === 'replacement-two',
  )
  const application = rendererHarness.applications[0]
  const renders = vi.mocked(application?.render).mock.calls.length
  scene?.onRender()
  expect(application?.render).toHaveBeenCalledTimes(renders + 1)

  renderer.destroy()
  scene?.onRender()
  expect(application?.render).toHaveBeenCalledTimes(renders + 1)
})

it('should ignore an obsolete initial scene rejection after a replacement begins', async () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.rejecters.has('initial')).toBe(true))

  const replacement = renderer.replaceDefinition(createDefinition('replacement'))
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('replacement')).toBe(true))
  rendererHarness.rejecters.get('initial')?.(new Error('obsolete initial'))
  await initialization
  rendererHarness.resolvers.get('replacement')?.()
  await replacement

  expect(rendererHarness.scenes.find((scene) => scene.definitionId === 'initial')?.destroyed).toBe(
    true,
  )
  renderer.destroy()
})

it('should stop initial-scene setup after destruction and ignore an obsolete replacement error', async () => {
  const renderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('initial'),
  })
  const initialization = renderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('initial')).toBe(true))
  renderer.destroy()
  rendererHarness.resolvers.get('initial')?.()
  await initialization

  const activeRenderer = new PLayerReviewRenderer(document.createElement('div'), {
    definition: createDefinition('active'),
  })
  const activeInitialization = activeRenderer.initialize(state)
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('active')).toBe(true))
  rendererHarness.resolvers.get('active')?.()
  await activeInitialization

  const obsoleteReplacement = activeRenderer.replaceDefinition(createDefinition('obsolete'))
  await vi.waitFor(() => expect(rendererHarness.rejecters.has('obsolete')).toBe(true))
  const latestReplacement = activeRenderer.replaceDefinition(createDefinition('latest'))
  await vi.waitFor(() => expect(rendererHarness.resolvers.has('latest')).toBe(true))
  rendererHarness.rejecters.get('obsolete')?.(new Error('obsolete replacement'))
  await obsoleteReplacement
  rendererHarness.resolvers.get('latest')?.()
  await latestReplacement
  activeRenderer.destroy()
})
