/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import {isTwoDimensionalParameterBinding} from '../../deformation'
import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {createDemoDocument} from '../create-demo-document'
import {createPlayer} from '../create-player'
import {parseDocument} from '../parse-document'

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

    const sourceDocument = createDemoDocument()
    const document: PuppetDocument = {
      ...sourceDocument,
      parts: sourceDocument.parts.map((part) => ({...part, properties: undefined})),
    }
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

  test('should apply interpolated properties and compose chained masks', async () => {
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
    const containers: Array<{
      addChild: ReturnType<typeof vi.fn>
      position: {set: ReturnType<typeof vi.fn>}
      scale: {set: ReturnType<typeof vi.fn>}
    }> = []
    const runtimeMeshes: Array<{
      addEffect: ReturnType<typeof vi.fn>
      alpha: number
      blendMode: string
      filters: unknown
      geometry: {
        indices: Uint32Array
        positions: Float32Array
        uvs: Float32Array
      }
      setMask: ReturnType<typeof vi.fn>
      vertices: Float32Array
      visible: boolean
    }> = []

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
          const container = {
            addChild: vi.fn(),
            position: {set: vi.fn()},
            scale: {set: vi.fn()},
          }
          containers.push(container)
          Object.assign(this, container)
        }
      } as unknown as () => unknown,
    )
    mocks.MeshSimple.mockImplementation(
      class {
        addEffect = vi.fn()
        alpha = 1
        blendMode = 'normal'
        filters: unknown = null
        geometry: {
          indices: Uint32Array
          positions: Float32Array
          uvs: Float32Array
        }
        setMask = vi.fn()
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
          runtimeMeshes.push(this)
        }
      } as unknown as () => unknown,
    )
    mocks.AlphaMask.mockImplementation(
      class {
        channel = 'red'
        inverse = false
        mask: unknown

        constructor(options: {readonly mask: unknown}) {
          this.mask = options.mask
        }
      } as unknown as () => unknown,
    )
    mocks.ColorMatrixFilter.mockImplementation(
      class {
        matrix: ReadonlyArray<number> = []
      } as unknown as () => unknown,
    )
    mocks.TextureFrom.mockReturnValue({destroy: vi.fn()})

    const source = createDemoDocument()
    const part = source.parts[0]!
    const binding = source.parameterBindings![0]!
    if (!isTwoDimensionalParameterBinding(binding)) {
      throw new Error('Expected a two-dimensional demo parameter')
    }
    const renderDocument: PuppetDocument = {
      ...source,
      parameterBindings: [
        {
          ...binding,
          keyforms: binding.keyforms.map((keyform) => ({
            ...keyform,
            parts: keyform.parts.map((keyformPart) => ({
              ...keyformPart,
              properties: {
                multiplyColor: [0.5, 1, 0.25] as const,
                opacity: (keyform.values[0] + 30) / 60,
                screenColor: [0.2, 0, 0.4] as const,
              },
            })),
          })),
        },
      ],
      parts: [
        {
          ...part,
          properties: {
            blendMode: 'multiply' as const,
            clippingMaskIds: ['shape-circle'],
            renderWhenUsedAsMask: true,
          },
        },
        {...source.parts[1]!, properties: undefined},
        {
          ...source.parts[2]!,
          properties: {clippingMaskIds: ['mesh-preview']},
        },
      ],
    }
    const player = await createPlayer({
      canvas: window.document.createElement('canvas'),
      document: prepareDocument(renderDocument),
      parameterValues: {'angle-x': 15, 'angle-y': 0},
    })
    const styledMesh = runtimeMeshes[0]!
    const clippedMesh = runtimeMeshes[2]!
    const nestedMaskSource = runtimeMeshes[4]!
    const root = containers[0]!
    const styledMask = containers[1]!
    const clippedMask = containers[2]!
    const nestedMask = containers[3]!

    expect(styledMesh.alpha).toBe(0.75)
    expect(styledMesh.blendMode).toBe('multiply')
    expect(styledMesh.filters).toEqual([mocks.ColorMatrixFilter.mock.results[0]?.value])
    expect(mocks.ColorMatrixFilter.mock.results[0]?.value.matrix).toEqual([
      0.4, 0, 0, 0, 0.2, 0, 1, 0, 0, 0, 0, 0, 0.15, 0, 0.4, 0, 0, 0, 1, 0,
    ])
    expect(styledMask.addChild).toHaveBeenCalledOnce()
    expect(clippedMask.addChild).toHaveBeenCalledWith(nestedMask)
    const styledEffect = mocks.AlphaMask.mock.results[0]?.value
    const nestedEffect = mocks.AlphaMask.mock.results[1]?.value
    const clippedMaskEffect = mocks.AlphaMask.mock.results[2]?.value
    expect(styledEffect).toMatchObject({channel: 'alpha', mask: styledMask})
    expect(styledMesh.addEffect).toHaveBeenCalledWith(styledEffect)
    expect(nestedMaskSource.addEffect).toHaveBeenCalledWith(nestedEffect)
    expect(nestedEffect).toMatchObject({channel: 'alpha', inverse: false, mask: nestedMask})
    expect(clippedMaskEffect).toMatchObject({channel: 'alpha', inverse: false, mask: clippedMask})
    expect(clippedMesh.addEffect).toHaveBeenCalledWith(clippedMaskEffect)
    expect(root.addChild).toHaveBeenCalledWith(clippedMask)
    expect(root.addChild).toHaveBeenCalledWith(styledMesh)

    player.setParameterValues({'angle-x': -15, 'angle-y': 0})
    expect(styledMesh.alpha).toBe(0.25)

    const hiddenMaskSourceDocument = prepareDocument({
      ...renderDocument,
      parts: renderDocument.parts.map((candidate) =>
        candidate.id === part.id
          ? {
              ...candidate,
              properties: {...candidate.properties, renderWhenUsedAsMask: false},
            }
          : candidate,
      ),
    })
    expect(player.updateDocument(hiddenMaskSourceDocument)).toBe(true)
    expect(styledMesh.visible).toBe(false)

    const changedMaskUvDocument = prepareDocument({
      ...hiddenMaskSourceDocument,
      parts: hiddenMaskSourceDocument.parts.map((candidate) =>
        candidate.id === part.id
          ? {...candidate, mesh: {...candidate.mesh, uvs: [...candidate.mesh.uvs].reverse()}}
          : candidate,
      ),
    })
    expect(player.updateDocument(changedMaskUvDocument)).toBe(false)
  })
})
