/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import {isTwoDimensionalParameterBinding} from '../../deformation'
import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {createDemoDocument} from '../create-demo-document'
import {createPlayer} from '../create-player'
import {parseDocument} from '../parse-document'

import {serializeDocument} from '../serialize-document'

const mocks = vi.hoisted(() => ({
  Application: vi.fn(),
  ColorMatrixFilter: vi.fn(),
  Container: vi.fn(),
  MaskFilter: vi.fn(),
  Matrix: vi.fn(),
  MeshSimple: vi.fn(),
  RenderTextureCreate: vi.fn(),
  Sprite: vi.fn(),
  TextureFrom: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Application: mocks.Application,
  ColorMatrixFilter: mocks.ColorMatrixFilter,
  Container: mocks.Container,
  MaskFilter: mocks.MaskFilter,
  Matrix: mocks.Matrix,
  MeshSimple: mocks.MeshSimple,
  RenderTexture: {create: mocks.RenderTextureCreate},
  Sprite: mocks.Sprite,
  Texture: {from: mocks.TextureFrom},
  UPDATE_PRIORITY: {LOW: -50},
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
      canvas: globalThis.document.createElement('canvas'),
      document: prepareDocument(document),
    })
    const runtimeMeshes = mocks.MeshSimple.mock.results.map(
      (result) => result.value as {visible: boolean},
    )

    expect(root.addChild.mock.calls.slice(0, 3).map(([mesh]) => mesh)).toEqual(runtimeMeshes)

    const orderedDocument = prepareDocument({
      ...document,
      layerOrderRules: [
        {
          partIds: [document.parts[1]!.id, document.parts[2]!.id],
          placement: 'before',
          referencePartId: document.parts[0]!.id,
          when: {comparison: 'greater-than', parameterIds: ['angle-x', 'angle-y'], threshold: 20},
        },
      ],
      motions: [],
    })
    player.updateDocument(orderedDocument)
    player.setParameterValues({'angle-x': 15, 'angle-y': 10})
    expect(root.addChild.mock.calls.slice(-3).map(([mesh]) => mesh)).toEqual([
      runtimeMeshes[1],
      runtimeMeshes[2],
      runtimeMeshes[0],
    ])
    player.setParameterValues({'angle-x': 0, 'angle-y': 0})
    expect(root.addChild.mock.calls.slice(-3).map(([mesh]) => mesh)).toEqual(runtimeMeshes)

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
      renderer: {render: vi.fn(), resetState: vi.fn(), resolution: 1},
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
            destroy: vi.fn(),
            position: {set: vi.fn()},
            scale: {set: vi.fn(), x: 1},
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
    mocks.MaskFilter.mockImplementation(
      class {
        destroy = vi.fn()
        inverse = false
        constructor(options: {readonly sprite: unknown; readonly channel: string}) {
          Object.assign(this, options)
        }
      } as unknown as () => unknown,
    )
    mocks.Matrix.mockImplementation(
      class {
        translate = vi.fn().mockReturnThis()
      } as unknown as () => unknown,
    )
    mocks.Sprite.mockImplementation(
      class {
        destroy = vi.fn()
        position = {set: vi.fn()}
        texture: unknown
        constructor(texture: unknown) {
          this.texture = texture
        }
      } as unknown as () => unknown,
    )
    mocks.RenderTextureCreate.mockImplementation(() => {
      const texture = {
        destroy: vi.fn(),
        height: 1,
        resize: vi.fn((width: number, height: number, resolution: number) => {
          texture.width = width
          texture.height = height
          texture.source.resolution = resolution
        }),
        source: {resolution: 1},
        width: 1,
      }
      return texture
    })
    mocks.ColorMatrixFilter.mockImplementation(
      class {
        destroy = vi.fn()
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
    const onFrame = vi.fn()
    const player = await createPlayer({
      canvas: globalThis.document.createElement('canvas'),
      document: prepareDocument(renderDocument),
      onAfterRender: vi.fn(),
      onFrame,
      parameterValues: {'angle-x': 15, 'angle-y': 0},
    })
    expect(application.renderer.resetState.mock.invocationCallOrder[0]).toBeLessThan(
      application.renderer.render.mock.invocationCallOrder[0]!,
    )
    expect(application.renderer.render.mock.invocationCallOrder.at(-1)).toBeLessThan(
      onFrame.mock.invocationCallOrder[0]!,
    )
    const styledMesh = runtimeMeshes[0]!
    const clippedMesh = runtimeMeshes[2]!
    const nestedMaskSource = runtimeMeshes[4]!
    const root = containers[0]!
    const styledMask = containers[1]!
    const clippedMask = containers[2]!
    const nestedMask = containers[3]!

    expect(styledMesh.alpha).toBe(0.75)
    expect(styledMesh.blendMode).toBe('normal')
    expect(styledMesh.filters).toEqual([
      mocks.ColorMatrixFilter.mock.results[0]?.value,
      mocks.MaskFilter.mock.results[0]?.value,
    ])
    expect(mocks.ColorMatrixFilter.mock.results[0]?.value.matrix).toEqual([
      0.4, 0, 0, 0, 0.2, 0, 1, 0, 0, 0, 0, 0, 0.15, 0, 0.4, 0, 0, 0, 1, 0,
    ])
    expect(styledMask.addChild).toHaveBeenCalledOnce()
    expect(clippedMask.addChild).toHaveBeenCalledWith(mocks.Sprite.mock.results[1]?.value)
    const styledEffect = mocks.MaskFilter.mock.results[0]?.value
    const nestedEffect = mocks.MaskFilter.mock.results[1]?.value
    const clippedMaskEffect = mocks.MaskFilter.mock.results[2]?.value
    expect(styledEffect).toMatchObject({
      blendMode: 'multiply',
      channel: 'alpha',
      sprite: mocks.Sprite.mock.results[0]?.value,
    })
    expect(nestedMaskSource.filters).toEqual([nestedEffect])
    expect(nestedEffect).toMatchObject({channel: 'alpha', inverse: false})
    expect(clippedMaskEffect).toMatchObject({channel: 'alpha', inverse: false})
    expect(clippedMesh.filters).toEqual([clippedMaskEffect])
    expect(root.addChild).toHaveBeenCalledWith(mocks.Sprite.mock.results[2]?.value)
    expect(root.addChild).toHaveBeenCalledWith(styledMesh)

    const textures = mocks.RenderTextureCreate.mock.results.map((result) => result.value)
    const allocations = textures.map((texture) => texture.resize.mock.calls.length)
    const passes = application.renderer.render.mock.calls.length
    player.seek(0)
    expect(textures.map((texture) => texture.resize.mock.calls.length)).toEqual(allocations)
    expect(application.renderer.render.mock.calls.length - passes).toBe(3)

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
    expect(mocks.RenderTextureCreate).toHaveBeenCalledTimes(3)
    expect(application.renderer.render).toHaveBeenCalled()
    player.destroy()
    player.destroy()
    for (const result of mocks.RenderTextureCreate.mock.results) {
      expect(result.value.destroy).toHaveBeenCalledExactlyOnceWith(true)
    }
    for (const result of mocks.MaskFilter.mock.results) {
      expect(result.value.destroy).toHaveBeenCalledOnce()
    }
    for (const result of mocks.Sprite.mock.results) {
      expect(result.value.destroy).toHaveBeenCalledOnce()
    }
    expect(application.destroy).toHaveBeenCalledOnce()
  })
})
