/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'
import {prepareDocument, puppetDocument} from './fixtures/document'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'

import {createPlayer} from '../create-player'
import {parseDocument} from '../parse-document'
import type {PreparedPuppetDocument} from '../prepare-puppet-document'
import {serializeDocument} from '../serialize-document'
import {markPreparedPuppetDocument} from '../internal/prepared-document'

const mocks = vi.hoisted(() => ({
  AlphaMask: vi.fn(),
  Application: vi.fn(),
  ColorMatrixFilter: vi.fn(),
  Container: vi.fn(),
  MeshSimple: vi.fn(),
  TextureFrom: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  AlphaMask: mocks.AlphaMask,
  Application: mocks.Application,
  ColorMatrixFilter: mocks.ColorMatrixFilter,
  Container: mocks.Container,
  MeshSimple: mocks.MeshSimple,
  Texture: {from: mocks.TextureFrom},
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('createPlayer physics', () => {
  test('should apply pendulum output to parameter deformation at a fixed simulation step', async () => {
    let tick: ((ticker: {readonly deltaMS: number}) => void) | undefined
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      resize: vi.fn(),
      screen: {height: 100, width: 200},
      stage: {addChild: vi.fn()},
      start: vi.fn(),
      stop: vi.fn(),
      ticker: {
        add: vi.fn((handler: (ticker: {readonly deltaMS: number}) => void) => {
          tick = handler
        }),
      },
    }
    const root = {
      addChild: vi.fn(),
      position: {set: vi.fn()},
      scale: {set: vi.fn()},
    }
    const runtimeMesh = {
      geometry: {
        indices: new Uint32Array(),
        positions: new Float32Array(),
        uvs: new Float32Array(),
      },
      vertices: new Float32Array(),
    }
    const texture = {destroy: vi.fn()}
    const physicsDocument: PuppetDocument = {
      ...puppetDocument,
      parameterBindings: [
        {
          id: 'output-binding',
          keyforms: [
            {
              parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 100]}],
              values: [0],
            },
            {
              parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 200]}],
              values: [30],
            },
          ],
          parameterIds: ['output'],
          targetPartIds: ['part'],
        },
      ],
      parameters: [
        {defaultValue: 0, id: 'input', maximum: 30, minimum: -30, name: 'Input'},
        {defaultValue: 0, id: 'output', maximum: 30, minimum: 0, name: 'Output'},
      ],
      parts: [
        {
          id: 'part',
          mesh: {
            boundaryLoops: [[0, 1, 2]],
            indices: [0, 1, 2],
            uvs: [0, 0, 1, 0, 0, 1],
            vertices: [0, 0, 100, 0, 0, 100],
          },
          texture: {height: 100, src: 'part.png', width: 100},
        },
      ],
      physics: {
        pendulums: [
          {
            damping: 1.2,
            gravity: 9.8,
            id: 'swing',
            inputParameterId: 'input',
            inputScale: 1,
            length: 1,
            outputParameterId: 'output',
            outputScale: 1,
          },
        ],
      },
    }

    vi.stubGlobal(
      'Image',
      class {
        decoding = ''
        src = ''
        decode = vi.fn().mockResolvedValue(undefined)
      },
    )
    mocks.Application.mockImplementation(
      class {
        constructor() {
          Object.assign(this, application)
        }
      } as unknown as () => unknown,
    )
    mocks.Container.mockImplementation(
      class {
        constructor() {
          Object.assign(this, root)
        }
      } as unknown as () => unknown,
    )
    mocks.MeshSimple.mockImplementation(
      class {
        constructor() {
          Object.assign(this, runtimeMesh)
        }
      } as unknown as () => unknown,
    )
    mocks.TextureFrom.mockReturnValue(texture)

    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: prepareDocument(physicsDocument),
      parameterValues: {input: 30, output: 0},
    })
    const createdMesh = mocks.MeshSimple.mock.results[0]?.value as
      | {readonly vertices: Float32Array}
      | undefined
    const initialY = createdMesh?.vertices[5]

    for (let frame = 0; frame < 60; frame += 1) {
      tick?.({deltaMS: 1_000 / 60})
    }

    expect(createdMesh?.vertices[5]).toBeGreaterThan(initialY ?? 0)
    player.destroy()
  })

  test('should preserve Physics behavior across seek, playback controls, and document replacement', async () => {
    let tick: ((ticker: {readonly deltaMS: number}) => void) | undefined
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      resize: vi.fn(),
      screen: {height: 100, width: 200},
      stage: {addChild: vi.fn()},
      start: vi.fn(),
      stop: vi.fn(),
      ticker: {
        add: vi.fn((handler: (ticker: {readonly deltaMS: number}) => void) => {
          tick = handler
        }),
      },
    }
    const root = {
      addChild: vi.fn(),
      position: {set: vi.fn()},
      scale: {set: vi.fn()},
    }
    const runtimeMesh = {
      geometry: {
        indices: new Uint32Array(),
        positions: new Float32Array(),
        uvs: new Float32Array(),
      },
      vertices: new Float32Array(),
    }
    const texture = {destroy: vi.fn()}
    const onFrame = vi.fn()
    const physicsDocument: PuppetDocument = {
      ...puppetDocument,
      motions: [{duration: 2, id: 'idle', tracks: []}],
      parameterBindings: [
        {
          id: 'output-binding',
          keyforms: [
            {
              parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 100]}],
              values: [0],
            },
            {
              parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 200]}],
              values: [30],
            },
          ],
          parameterIds: ['output'],
          targetPartIds: ['part'],
        },
      ],
      parameters: [
        {defaultValue: 0, id: 'input', maximum: 30, minimum: -30, name: 'Input'},
        {defaultValue: 0, id: 'output', maximum: 30, minimum: 0, name: 'Output'},
      ],
      parts: [
        {
          id: 'part',
          mesh: {
            boundaryLoops: [[0, 1, 2]],
            indices: [0, 1, 2],
            uvs: [0, 0, 1, 0, 0, 1],
            vertices: [0, 0, 100, 0, 0, 100],
          },
          texture: {height: 100, src: 'part.png', width: 100},
        },
      ],
      physics: {
        pendulums: [
          {
            damping: 1.2,
            gravity: 9.8,
            id: 'swing',
            inputParameterId: 'input',
            inputScale: 1,
            length: 1,
            outputParameterId: 'output',
            outputScale: 1,
          },
        ],
      },
      scene: {
        roots: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}],
      },
    }

    vi.stubGlobal(
      'Image',
      class {
        decoding = ''
        src = ''
        decode = vi.fn().mockResolvedValue(undefined)
      },
    )
    mocks.Application.mockImplementation(
      class {
        constructor() {
          Object.assign(this, application)
        }
      } as unknown as () => unknown,
    )
    mocks.Container.mockImplementation(
      class {
        constructor() {
          Object.assign(this, root)
        }
      } as unknown as () => unknown,
    )
    mocks.MeshSimple.mockImplementation(
      class {
        constructor() {
          Object.assign(this, runtimeMesh)
        }
      } as unknown as () => unknown,
    )
    mocks.TextureFrom.mockReturnValue(texture)

    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: prepareDocument(physicsDocument),
      onFrame,
      parameterValues: {input: 30, output: 0},
    })
    const createdMesh = mocks.MeshSimple.mock.results[0]?.value as
      | {readonly vertices: Float32Array}
      | undefined

    expect(createdMesh?.vertices[5]).toBeCloseTo(100)
    tick?.({deltaMS: 1_000 / 60})
    expect(createdMesh?.vertices[5]).toBeGreaterThan(100)

    player.pause()
    player.seek(0.5)
    const pausedY = createdMesh!.vertices[5]!
    tick!({deltaMS: 1_000 / 60})
    expect(createdMesh!.vertices[5]).toBeGreaterThan(pausedY)
    expect(onFrame).toHaveBeenLastCalledWith({duration: 2, motionId: 'idle', time: 0.5})
    expect(application.stop).not.toHaveBeenCalled()

    player.setPhysicsPreview(false)
    expect(createdMesh?.vertices[5]).toBeCloseTo(200)
    expect(application.stop).toHaveBeenCalledOnce()
    player.setParameterValues({input: 15})
    expect(createdMesh?.vertices[5]).toBeCloseTo(150)
    player.setPhysicsPreview(true)
    player.setParameterValues({input: 0})
    tick?.({deltaMS: 1_000 / 60})
    expect(createdMesh?.vertices[5]).toBeLessThan(150)
    player.resetPhysics()
    expect(createdMesh?.vertices[5]).toBeCloseTo(100)
    tick?.({deltaMS: 1_000 / 60})
    expect(createdMesh?.vertices[5]).toBeCloseTo(100)

    player.play()
    expect(application.start).toHaveBeenCalled()

    const onComplete = vi.fn()
    player.setParameterValues({input: 30})
    player.play({loop: false, onComplete})
    player.seek(1.99)
    tick?.({deltaMS: 20})
    expect(onComplete).toHaveBeenCalledOnce()
    const completedY = createdMesh!.vertices[5]!
    tick!({deltaMS: 20})
    expect(onFrame).toHaveBeenLastCalledWith({duration: 2, motionId: 'idle', time: 2})
    expect(createdMesh!.vertices[5]).toBeGreaterThan(completedY)
    expect(onComplete).toHaveBeenCalledOnce()

    const prepared = prepareDocument(physicsDocument)
    expect(player.updateDocument(prepared)).toBe(true)
    tick?.({deltaMS: 20})
    const beforeEditY = createdMesh!.vertices[5]
    expect(
      player.updateDocument(markPreparedPuppetDocument({...prepared, parts: [...prepared.parts]})),
    ).toBe(true)
    expect(createdMesh?.vertices[5]).toBe(beforeEditY)

    player.seek(0.5)
    expect(onFrame).toHaveBeenLastCalledWith({duration: 2, motionId: 'idle', time: 0.5})

    const replacementDocument = prepareDocument({...physicsDocument, physics: undefined})
    expect(player.updateDocument(replacementDocument)).toBe(true)
    expect(createdMesh?.vertices[5]).toBeCloseTo(100)
    player.destroy()
  })
})
