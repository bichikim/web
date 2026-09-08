/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'

import {createPlayer} from '../create-player'
import {parseDocument} from '../parse-document'
import type {PreparedPuppetDocument} from '../prepare-puppet-document'
import {serializeDocument} from '../serialize-document'

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

const puppetDocument: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 100, width: 200},
}

const prepareDocument = (document: PuppetDocument) => {
  const result = parseDocument(serializeDocument(document))

  if (!result.ok) {
    throw new Error('Expected the test document to be valid')
  }

  return result.document
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('createPlayer', () => {
  test('should reject a document that has not crossed the validation boundary', () => {
    const unpreparedDocument = puppetDocument as PreparedPuppetDocument

    return expect(
      createPlayer({canvas: document.createElement('canvas'), document: unpreparedDocument}),
    ).rejects.toThrow('Puppet document must be prepared before it is passed to the player')
  })

  test('should control a player without textured parts', async () => {
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      resize: vi.fn(),
      screen: {height: 100, width: 200},
      stage: {addChild: vi.fn()},
      start: vi.fn(),
      stop: vi.fn(),
      ticker: {add: vi.fn()},
    }
    const root = {
      addChild: vi.fn(),
      position: {set: vi.fn()},
      scale: {set: vi.fn()},
    }

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

    const preparedDocument = prepareDocument(puppetDocument)
    const replacementDocument = prepareDocument({
      ...puppetDocument,
      parts: [
        {
          id: 'new-part',
          mesh: {
            boundaryLoops: [[0, 1, 2]],
            indices: [0, 1, 2],
            uvs: [0, 0, 1, 0, 0, 1],
            vertices: [0, 0, 1, 0, 0, 1],
          },
          texture: {height: 1, src: 'new.png', width: 1},
        },
      ],
    })
    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: preparedDocument,
    })

    player.pause()
    player.play()
    player.seek(1)
    player.resize()

    expect(application.init).toHaveBeenCalledOnce()
    expect(application.stop).toHaveBeenCalledOnce()
    expect(application.start).toHaveBeenCalledOnce()
    expect(application.resize).toHaveBeenCalledOnce()
    expect(application.render).toHaveBeenCalledTimes(3)
    expect(player.updateDocument(preparedDocument)).toBe(true)
    expect(player.updateDocument(replacementDocument)).toBe(false)
    expect(() => player.updateDocument(puppetDocument as PreparedPuppetDocument)).toThrow(
      'Puppet document must be prepared before it is passed to the player',
    )

    player.destroy()
    player.destroy()
    expect(application.destroy).toHaveBeenCalledOnce()
  })

  test('should hold the final keyframe value until the motion loops', async () => {
    let tick: ((ticker: {readonly deltaMS: number}) => void) | undefined
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
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
    const motionDocument: PuppetDocument = {
      ...puppetDocument,
      motions: [
        {
          duration: 10,
          id: 'hold-final-frame',
          tracks: [
            {
              axis: 'x',
              keyframes: [
                {time: 0, value: 0},
                {time: 5, value: 50},
              ],
              kind: 'vertex',
              partId: 'part',
              vertexIndex: 0,
            },
            {
              keyframes: [
                {time: 0, value: 0},
                {time: 5, value: 1},
              ],
              kind: 'parameter',
              parameterId: 'shift',
            },
          ],
        },
      ],
      parameterBindings: [
        {
          id: 'shift-binding',
          keyforms: [
            {
              deformers: [
                {
                  controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
                  kind: 'deformer',
                  nodeId: 'deformer',
                },
              ],
              parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 100]}],
              values: [0],
            },
            {
              deformers: [
                {
                  controlPoints: [0, 0, 0, 100, -100, 0, -100, 100],
                  kind: 'deformer',
                  nodeId: 'deformer',
                },
              ],
              parts: [{partId: 'part', vertices: [0, 0, 125, 0, 0, 100]}],
              values: [1],
            },
          ],
          parameterIds: ['shift'],
          targetDeformerIds: ['deformer'],
          targetPartIds: ['part'],
        },
      ],
      parameters: [{defaultValue: 0, id: 'shift', maximum: 1, minimum: 0, name: 'Shift'}],
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
      scene: {
        roots: [
          {
            bounds: {height: 100, width: 100, x: 0, y: 0},
            children: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}],
            columns: 1,
            controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
            id: 'deformer',
            kind: 'deformer',
            locked: false,
            name: 'Deformer',
            rows: 1,
            visible: true,
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
      document: prepareDocument(motionDocument),
      onFrame,
    })
    tick?.({deltaMS: 6_000})
    const createdMesh = mocks.MeshSimple.mock.results[0]?.value as
      | {readonly vertices: Float32Array}
      | undefined

    expect(createdMesh?.vertices[0]).toBeCloseTo(0)
    expect(createdMesh?.vertices[1]).toBeCloseTo(50)
    expect(createdMesh?.vertices[2]).toBeCloseTo(0)
    expect(createdMesh?.vertices[3]).toBeCloseTo(125)
    expect(onFrame).toHaveBeenLastCalledWith({
      duration: 10,
      motionId: 'hold-final-frame',
      time: 6,
    })

    player.setParameterValues({shift: 1})
    expect(createdMesh?.vertices[0]).toBeCloseTo(0)
    expect(createdMesh?.vertices[1]).toBeCloseTo(50)
    expect(createdMesh?.vertices[2]).toBeCloseTo(0)
    expect(createdMesh?.vertices[3]).toBeCloseTo(125)
    player.setParameterValues({shift: 0})
    expect(createdMesh?.vertices[0]).toBeCloseTo(0)
    expect(createdMesh?.vertices[1]).toBeCloseTo(50)

    player.seek(2)
    const editedDocument = prepareDocument({
      ...motionDocument,
      motions: [
        {
          ...motionDocument.motions[0]!,
          tracks: [
            {
              ...motionDocument.motions[0]!.tracks[0]!,
              keyframes: [
                {time: 0, value: 0},
                {time: 5, value: 100},
              ],
            },
          ],
        },
      ],
    })

    expect(player.updateDocument(editedDocument)).toBe(true)
    expect(createdMesh?.vertices[0]).toBe(40)
    expect(onFrame).toHaveBeenLastCalledWith({
      duration: 10,
      motionId: 'hold-final-frame',
      time: 2,
    })

    player.seek(10)
    expect(createdMesh?.vertices[0]).toBe(100)
    expect(onFrame).toHaveBeenLastCalledWith({
      duration: 10,
      motionId: 'hold-final-frame',
      time: 10,
    })

    const influencedDocument = prepareDocument({
      ...motionDocument,
      motions: [],
      parameterBindings: motionDocument.parameterBindings!.map((binding) => ({
        ...binding,
        influences: [
          {
            parameterId: 'control',
            points: [
              {value: 0, weight: 1},
              {value: 1, weight: 0},
            ],
          },
        ],
      })),
      parameters: [
        ...motionDocument.parameters!,
        {id: 'control', minimum: 0, name: 'Control', defaultValue: 0, maximum: 1},
      ],
    })
    expect(player.updateDocument(influencedDocument)).toBe(true)
    player.setParameterValues({control: 0.5, shift: 1})
    expect(createdMesh!.vertices[2]).toBeCloseTo(56.25)
    expect(createdMesh!.vertices[3]).toBeCloseTo(56.25)
    player.setParameterValues({control: 1, shift: 1})
    expect(createdMesh!.vertices[2]).toBeCloseTo(100)
    expect(createdMesh!.vertices[3]).toBeCloseTo(0)
    player.setParameterValues({control: 0, shift: 1})
    expect(createdMesh!.vertices[2]).toBeCloseTo(0)
    expect(createdMesh!.vertices[3]).toBeCloseTo(125)
    player.destroy()
  })
})
