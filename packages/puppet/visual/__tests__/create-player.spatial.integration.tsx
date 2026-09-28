import {afterEach, describe, expect, test} from 'vitest'

import {createPlayer, type Player} from '../../src/player/create-player'
import {createDemoDocument} from '../../src/player/create-demo-document'
import {convertSceneContainers} from '../../src/editor/internal/container-conversion'
import {
  createSpatialThreeOverlay,
  type SpatialThreeOverlay,
} from '../../src/editor/internal/spatial-three-overlay'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'
import {serializeDocument} from '../../src/player/serialize-document'

const players: Array<Player> = []
const WIDTH = 64
const HEIGHT = 64

const createFace = (
  id: string,
  color: string,
  vertices: ReadonlyArray<number>,
  controlPoints: ReadonlyArray<number>,
): PuppetPart => ({
  id,
  mesh: {
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertices,
  },
  spatial: {
    controlPoints,
    groupId: 'head',
    origin: [32, 32, 0],
    rotationParameterIds: [null, 'yaw', null],
  },
  texture: {
    height: HEIGHT,
    src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/></svg>`)}`,
    width: WIDTH,
  },
})

afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
})

describe('createPlayer spatial faces', () => {
  test('preserves transparent artwork over its mask source after a part becomes spatial', async () => {
    const source = createDemoDocument()
    const parsed = parseDocument(serializeDocument(source))
    if (!parsed.ok) {
      throw new Error('Invalid demo document')
    }
    const canvas = document.createElement('canvas')
    const overlays: Array<SpatialThreeOverlay> = []
    const player = await createPlayer({
      canvas,
      document: parsed.document,
      onAfterRender: () => overlays[0]?.render(),
      onBeforeRender: () => overlays[0]?.prepare(),
      resolution: 1,
    })
    players.push(player)
    player.pause()
    const copy = document.createElement('canvas')
    copy.width = 640
    copy.height = 480
    const context = copy.getContext('2d')
    if (context === null) {
      throw new Error('Canvas 2D context unavailable')
    }
    const pixel = () => {
      context.clearRect(0, 0, 640, 480)
      context.drawImage(canvas, 0, 0)
      return Array.from(context.getImageData(90, 90, 1, 1).data)
    }
    const before = pixel()
    const [sourceNode, shapesNode] = source.scene!.roots
    const grouped = {
      ...source,
      scene: {
        roots: [
          {
            children: [sourceNode!],
            id: 'group',
            kind: 'group' as const,
            locked: false,
            name: 'Group',
            visible: true,
          },
          shapesNode!,
        ],
      },
    }
    const convertedDocument = convertSceneContainers({
      document: grouped,
      nodeIds: ['group'],
      targetKind: 'spatial',
    })
    if (convertedDocument === undefined) {
      throw new Error('Cannot convert demo group')
    }
    const converted = parseDocument(serializeDocument(convertedDocument))
    if (!converted.ok) {
      throw new Error('Invalid converted demo document')
    }
    expect(player.updateDocument(converted.document)).toBe(true)
    const overlay = createSpatialThreeOverlay(canvas)
    overlays.push(overlay)
    const deformer = converted.document.scene?.roots[0]
    if (deformer?.kind !== 'deformer') {
      throw new Error('Converted deformer is missing')
    }
    overlay.update({document: converted.document, node: deformer})
    player.redraw()
    expect(before[0] ?? 0).toBeGreaterThan(0)
    expect(pixel()).toEqual(before)
    overlay.destroy()
  })

  test('should redraw image vertices when a 3D deformer rotates without a control mesh', async () => {
    const front = createFace(
      'front',
      '#ff0000',
      [16, 16, 48, 16, 48, 48, 16, 48],
      [16, 16, 0, 48, 16, 0, 48, 48, 0, 16, 48, 0],
    )
    const node = {
      bounds: {height: 32, width: 32, x: 16, y: 16},
      children: [{id: 'front', kind: 'part' as const, locked: false, name: 'Front', visible: true}],
      columns: 1,
      controlPoints: [16, 16, 48, 16, 16, 48, 48, 48],
      deformerType: 'spatial' as const,
      id: 'head',
      kind: 'deformer' as const,
      locked: false,
      name: 'Head',
      rows: 1,
      spatialOrigin: [32, 32, 0] as const,
      spatialRotation: [0, 0, 0] as const,
      spatialRotationParameterIds: [null, null, null] as const,
      visible: true,
    }
    const model: PuppetDocument = {
      format: PUPPET_DOCUMENT_FORMAT,
      motions: [],
      parts: [{...front, spatial: {...front.spatial!, rotationParameterIds: [null, null, null]}}],
      scene: {roots: [node]},
      version: PUPPET_DOCUMENT_VERSION,
      viewport: {height: HEIGHT, width: WIDTH},
    }
    const parsed = parseDocument(serializeDocument(model))
    if (!parsed.ok) {
      throw new Error('Invalid spatial rendering fixture')
    }
    const canvas = document.createElement('canvas')
    const player = await createPlayer({canvas, document: parsed.document, resolution: 1})
    players.push(player)
    player.pause()
    const copy = document.createElement('canvas')
    copy.width = WIDTH
    copy.height = HEIGHT
    const context = copy.getContext('2d')!
    const pixelAt = (x: number, y: number) => {
      context.clearRect(0, 0, WIDTH, HEIGHT)
      context.drawImage(canvas, 0, 0, WIDTH, HEIGHT)
      return Array.from(context.getImageData(x, y, 1, 1).data)
    }
    expect(pixelAt(18, 32)).toEqual([255, 0, 0, 255])
    const rotated = parseDocument(
      serializeDocument({
        ...model,
        scene: {roots: [{...node, spatialRotation: [0, 60, 0]}]},
      }),
    )
    if (!rotated.ok) {
      throw new Error('Invalid rotated spatial fixture')
    }
    expect(player.updateDocument(rotated.document)).toBe(true)
    expect(pixelAt(18, 32)[3]).toBe(0)
    expect(pixelAt(32, 32)).toEqual([255, 0, 0, 255])
  })

  test('should render front artwork at rest and reveal separate side artwork after yaw rotation', async () => {
    const model: PuppetDocument = {
      format: PUPPET_DOCUMENT_FORMAT,
      motions: [],
      parameters: [{defaultValue: 0, id: 'yaw', maximum: 90, minimum: 0, name: 'Yaw'}],
      parts: [
        createFace(
          'front',
          '#ff0000',
          [16, 16, 48, 16, 48, 48, 16, 48],
          [16, 16, 0, 48, 16, 0, 48, 48, 0, 16, 48, 0],
        ),
        createFace(
          'side',
          '#0000ff',
          [16, 16, 48, 16, 48, 48, 16, 48],
          [48, 16, 0, 48, 16, 32, 48, 48, 32, 48, 48, 0],
        ),
      ],
      version: PUPPET_DOCUMENT_VERSION,
      viewport: {height: HEIGHT, width: WIDTH},
    }
    const parsed = parseDocument(serializeDocument(model))
    if (!parsed.ok) {
      throw new Error('Invalid spatial rendering fixture')
    }
    const canvas = document.createElement('canvas')
    const player = await createPlayer({canvas, document: parsed.document, resolution: 1})
    players.push(player)
    player.pause()
    const copy = document.createElement('canvas')
    copy.width = WIDTH
    copy.height = HEIGHT
    const context = copy.getContext('2d')!
    const pixelAt = (x: number, y: number) => {
      context.clearRect(0, 0, WIDTH, HEIGHT)
      context.drawImage(canvas, 0, 0, WIDTH, HEIGHT)
      return Array.from(context.getImageData(x, y, 1, 1).data)
    }

    player.seek(0)
    expect(pixelAt(32, 32)).toEqual([255, 0, 0, 255])
    player.setParameterValues({yaw: 90})
    player.seek(0)
    expect(pixelAt(48, 32)).toEqual([0, 0, 255, 255])
  })
})
