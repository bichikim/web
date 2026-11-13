/** @vitest-environment node */
import {createRequire} from 'node:module'
import {expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {serializeDocument} from '../../serialize-document'
import {decodeFile} from '../decode-file'
import {encodeFile} from '../encode-file'
import {decodeHeader, POFFO_HEADER_BYTES} from '../header'

vi.mock('brotli-wasm', () => ({
  default: Promise.resolve(createRequire(import.meta.url)('brotli-wasm')),
}))

const document = () => ({
  ...createEmptyDocument(),
  parts: [0, 1].map((index) => ({
    id: `part-${index}`,
    mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
    texture: {height: 1, src: 'data:image/png;base64,AAECAw==', width: 1},
  })),
})

test('should preserve the normalized document and every embedded byte without changing its source', async () => {
  const source = document()
  const before = structuredClone(source)
  const file = await encodeFile(source)
  expect(await decodeFile(file)).toEqual(JSON.parse(serializeDocument(source)))
  expect(source).toEqual(before)
  expect(file.type).toBe('application/vnd.poffo')
  const header = decodeHeader(new Uint8Array(await file.slice(0, POFFO_HEADER_BYTES).arrayBuffer()))
  expect(header.assetCount).toBe(1)
})

test('should preserve unknown authoring fields and audio data URLs', async () => {
  const source = {
    ...createEmptyDocument(),
    authoring: {
      label: '고양이🐈',
      numbers: [Number.MIN_VALUE, 0.1],
      sound: 'data:audio/wav;base64,AAEC',
    },
  }
  expect(await decodeFile(await encodeFile(source))).toEqual(source)
})

test('should keep raw sections when compression would make them larger', async () => {
  const source = {...createEmptyDocument(), raw: 'data:application/octet-stream;base64,AA=='}
  const file = await encodeFile(source)
  const header = decodeHeader(new Uint8Array(await file.slice(0, POFFO_HEADER_BYTES).arrayBuffer()))
  const index = JSON.parse(
    await file.slice(POFFO_HEADER_BYTES, POFFO_HEADER_BYTES + header.indexLength).text(),
  )
  expect(index.assets[0].codec).toBe(0)
  expect(await decodeFile(file)).toEqual(source)
})

test('should stop an already cancelled export before encoding', async () => {
  const controller = new AbortController()
  controller.abort(new Error('cancelled'))
  await expect(encodeFile(document(), controller.signal)).rejects.toBe(controller.signal.reason)
})
