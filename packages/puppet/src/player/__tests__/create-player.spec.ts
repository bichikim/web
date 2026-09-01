/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {createDemoDocument} from '../create-demo-document'
import {createPlayer} from '../create-player'
import {parseDocument} from '../parse-document'
import type {PreparedPuppetDocument} from '../prepare-puppet-document'
import {serializeDocument} from '../serialize-document'

const mocks = vi.hoisted(() => ({
  Application: vi.fn(),
  Container: vi.fn(),
  MeshSimple: vi.fn(),
  TextureFrom: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Application: mocks.Application,
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
              partId: 'part',
              vertexIndex: 0,
            },
          ],
        },
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

    expect(createdMesh?.vertices[0]).toBe(50)
    expect(onFrame).toHaveBeenLastCalledWith({
      duration: 10,
      motionId: 'hold-final-frame',
      time: 6,
    })

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
  })

  test('should apply scene order and inherited visibility to runtime meshes', async () => {
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
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
        geometry: {
          indices: Uint32Array
          positions: Float32Array
          uvs: Float32Array
        }
        vertices: Float32Array
        visible = true

        constructor(options: {
          readonly indices: Uint32Array
          readonly uvs: Float32Array
          readonly vertices: Float32Array
        }) {
          this.geometry = {
            indices: options.indices,
            positions: options.vertices,
            uvs: options.uvs,
          }
          this.vertices = options.vertices
        }
      } as unknown as () => unknown,
    )
    mocks.TextureFrom.mockReturnValue({destroy: vi.fn()})

    const document = createDemoDocument()
    const player = await createPlayer({
      canvas: window.document.createElement('canvas'),
      document: prepareDocument(document),
    })
    const runtimeMeshes = mocks.MeshSimple.mock.results.map(
      (result) => result.value as {visible: boolean},
    )

    expect(root.addChild.mock.calls.slice(0, 3).map(([mesh]) => mesh)).toEqual(runtimeMeshes)

    const group = document.scene!.roots[1]!
    const hiddenDocument = prepareDocument({
      ...document,
      scene: {roots: [document.scene!.roots[0]!, {...group, visible: false}]},
    })

    expect(player.updateDocument(hiddenDocument)).toBe(true)
    expect(runtimeMeshes.map((mesh) => mesh.visible)).toEqual([true, false, false])
  })
})
