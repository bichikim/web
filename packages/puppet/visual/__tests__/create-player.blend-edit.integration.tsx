import {afterEach, describe, expect, test} from 'vitest'

import {createPlayer, type Player} from '../../src/player/create-player'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
  type PuppetPartBlendMode,
  type PuppetPartRenderProperties,
  type PuppetSceneNode,
} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'
import {serializeDocument} from '../../src/player/serialize-document'

const SIZE = 64
const players: Array<Player> = []

afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
})

const createPart = (
  id: string,
  color: string,
  properties: PuppetPartRenderProperties = {},
  [x, y, width, height] = [0, 0, SIZE, SIZE],
): PuppetPart => ({
  id,
  mesh: {
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertices: [x, y, x + width, y, x + width, y + height, x, y + height],
  },
  properties,
  texture: {
    height: SIZE,
    src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${color}"/></svg>`)}`,
    width: SIZE,
  },
})

const partNode = (id: string): PuppetSceneNode => ({
  id,
  kind: 'part',
  locked: false,
  name: id,
  visible: true,
})

/**
 * 배경 위에 마스크로 자른 전경을 그린다. 구석의 overlay 파트는 두 문서 모두 백드롭 블렌드를 쓰게
 * 해서, 블렌드 모드만 바꾼 편집이 플레이어를 재사용하도록 한다.
 */
const createModel = (blendMode: PuppetPartBlendMode, target: 'layer' | 'part'): PuppetDocument => {
  const masked = {blendMode, clippingMaskIds: ['mask']}
  return {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parts: [
      createPart('background', '#c8a078'),
      createPart('mask', '#ffffff', {renderWhenUsedAsMask: false}, [0, 0, SIZE / 2, SIZE]),
      createPart('foreground', '#f08070', target === 'part' ? masked : {}),
      createPart('anchor', '#808080', {blendMode: 'overlay'}, [SIZE - 4, SIZE - 4, 4, 4]),
    ],
    scene: {
      roots: [
        partNode('background'),
        partNode('mask'),
        target === 'part'
          ? partNode('foreground')
          : {
              children: [partNode('foreground')],
              id: 'layer',
              kind: 'group',
              locked: false,
              name: 'layer',
              properties: {...masked, offscreen: true},
              visible: true,
            },
        partNode('anchor'),
      ],
    },
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: SIZE, width: SIZE},
  }
}

const prepare = (model: PuppetDocument) => {
  const prepared = parseDocument(serializeDocument(model))
  if (!prepared.ok) {
    throw new Error('Invalid rendering fixture')
  }
  return prepared.document
}

/** 마스크 안쪽(왼쪽 절반)의 한 픽셀을 읽는 플레이어. */
const renderInsidePixel = async (model: PuppetDocument) => {
  const canvas = document.createElement('canvas')
  const player = await createPlayer({canvas, document: prepare(model), resolution: 1})
  players.push(player)
  player.pause()
  const copy = document.createElement('canvas')
  copy.width = SIZE
  copy.height = SIZE
  const context = copy.getContext('2d')!
  const readPixel = () => {
    player.seek(0)
    context.clearRect(0, 0, SIZE, SIZE)
    context.drawImage(canvas, 0, 0, SIZE, SIZE)
    return Array.from(context.getImageData(16, 32, 1, 1).data)
  }
  return {player, readPixel}
}

describe('createPlayer blend mode edits', () => {
  test.each([
    ['part', 'multiply', 'overlay'],
    ['layer', 'multiply', 'lighten'],
  ] as const)(
    'should render a masked %s switched from %s to %s like a freshly created player',
    async (target, fixedMode, backdropMode) => {
      const edited = await renderInsidePixel(createModel(fixedMode, target))
      edited.readPixel()
      expect(edited.player.updateDocument(prepare(createModel(backdropMode, target)))).toBe(true)
      const fresh = await renderInsidePixel(createModel(backdropMode, target))

      const want = fresh.readPixel()
      edited
        .readPixel()
        .forEach((value, index) => expect(Math.abs(value - want[index]!)).toBeLessThanOrEqual(1))
    },
  )
})
