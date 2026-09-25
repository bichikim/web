import {zipSync} from 'fflate'
import {expect, test} from 'vitest'

import {convertCmo3} from '../convert-cmo3'
import {readCmo3Archive} from '../read-cmo3-archive'

interface ArchiveEntry {
  readonly path: string
  readonly tag: string
  readonly bytes: Uint8Array
  readonly compression?: number
}

const HEADER_LENGTH = 54
const ENCODER = new TextEncoder()
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/qV8AAAAASUVORK5CYII=',
    'base64',
  ),
)

const makeArchive = (entries: ReadonlyArray<ArchiveEntry>): Uint8Array => {
  const descriptors = entries.map((entry) => ({
    ...entry,
    pathBytes: ENCODER.encode(entry.path),
    tagBytes: ENCODER.encode(entry.tag),
  }))
  const tableLength = descriptors.reduce(
    (length, entry) =>
      length + 1 + entry.pathBytes.length + 1 + entry.tagBytes.length + 8 + 4 + 1 + 1 + 8,
    4,
  )
  const bytes = new Uint8Array(
    HEADER_LENGTH + tableLength + entries.reduce((sum, entry) => sum + entry.bytes.length, 0),
  )
  const view = new DataView(bytes.buffer)
  bytes.set(ENCODER.encode('CAFF'))
  view.setInt32(HEADER_LENGTH, entries.length, false)
  let tableOffset = HEADER_LENGTH + 4
  let dataOffset = HEADER_LENGTH + tableLength
  for (const entry of descriptors) {
    bytes[tableOffset] = entry.pathBytes.length
    tableOffset += 1
    bytes.set(entry.pathBytes, tableOffset)
    tableOffset += entry.pathBytes.length
    bytes[tableOffset] = entry.tagBytes.length
    tableOffset += 1
    bytes.set(entry.tagBytes, tableOffset)
    tableOffset += entry.tagBytes.length
    view.setUint32(tableOffset + 4, dataOffset, false)
    tableOffset += 8
    view.setInt32(tableOffset, entry.bytes.length, false)
    tableOffset += 4
    bytes[tableOffset] = 0
    tableOffset += 1
    bytes[tableOffset] = entry.compression ?? 16
    tableOffset += 1 + 8
    bytes.set(entry.bytes, dataOffset)
    dataOffset += entry.bytes.length
  }
  return bytes
}

const artMesh = (id: string, guidRef: string, clippingRef?: string) => `
  <CArtMeshSource>
    <ACDrawableSource xs.n="super">
      <CDrawableId xs.n="id" idstr="${id}"/>
      <CDrawableGuid xs.n="guid" xs.ref="${guidRef}"/>
      <carray_list xs.n="clipGuidList">
        ${clippingRef === undefined ? '' : `<CDrawableGuid xs.ref="${clippingRef}"/>`}
      </carray_list>
      <b xs.n="invertClippingMask">true</b>
    </ACDrawableSource>
    <int-array xs.n="indices">0 1 2</int-array>
    <float-array xs.n="positions">0 0 10 0 0 10</float-array>
    <float-array xs.n="uvs">0 0 1 0 0 1</float-array>
    <GTexture2D xs.n="texture">
      <CImageResource xs.n="srcImageResource" width="1" height="1">
        <file xs.n="imageFileBuf" path="image.png"/>
      </CImageResource>
    </GTexture2D>
  </CArtMeshSource>`

const modelXml = (clippingRef = '#mask-guid') => `
  <root>
    <CDrawableGuid xs.id="#mask-guid" uuid="mask-uuid"/>
    <CDrawableGuid xs.id="#eye-guid" uuid="eye-uuid"/>
    <main><CModelSource>
      <CImageCanvas xs.n="canvas"><i xs.n="pixelWidth">100</i><i xs.n="pixelHeight">100</i></CImageCanvas>
      <CDrawableSourceSet xs.n="drawableSourceSet"><carray_list xs.n="_sources">
        ${artMesh('mask', '#mask-guid')}
        ${artMesh('eye', '#eye-guid', clippingRef)}
      </carray_list></CDrawableSourceSet>
    </CModelSource></main>
  </root>`

const archive = (xml: string) =>
  makeArchive([
    {bytes: ENCODER.encode(xml), path: 'main.xml', tag: 'main_xml'},
    {bytes: PNG, path: 'image.png', tag: 'image'},
  ])

test('converts drawable mask references to Puppet part IDs', () => {
  const {document} = convertCmo3(archive(modelXml()))
  expect(document.parts).toHaveLength(2)
  expect(document.parts.find((part) => part.id === 'eye')?.properties).toMatchObject({
    clippingMaskIds: ['mask'],
  })
  expect(document.parts.find((part) => part.id === 'mask')?.properties).toMatchObject({
    invertedMask: true,
    renderWhenUsedAsMask: true,
  })
})

test('rejects a mask whose source cannot be converted', () => {
  expect(() => convertCmo3(archive(modelXml('#missing-guid')))).toThrow('mask source is missing')
})

test('rejects an invalid archive signature', () => {
  expect(() => readCmo3Archive(Uint8Array.of(1, 2, 3, 4))).toThrow('not a CMO3 CAFF archive')
})

test('does not produce a document with a corrupt image', () => {
  const source = makeArchive([
    {bytes: ENCODER.encode(modelXml()), path: 'main.xml', tag: 'main_xml'},
    {bytes: Uint8Array.of(1, 2, 3), path: 'image.png', tag: 'image'},
  ])
  expect(() => convertCmo3(source)).toThrow('no convertible textured meshes')
})

test('reads a ZIP wrapped archive entry without a central directory', () => {
  const zip = zipSync({contents: ENCODER.encode('hello')})
  const centralDirectory = zip.findIndex(
    (value, index) =>
      value === 0x50 &&
      zip[index + 1] === 0x4b &&
      zip[index + 2] === 0x01 &&
      zip[index + 3] === 0x02,
  )
  expect(centralDirectory).toBeGreaterThan(0)
  const source = makeArchive([
    {
      bytes: zip.subarray(0, centralDirectory),
      compression: 33,
      path: 'main.xml',
      tag: 'main_xml',
    },
  ])
  expect(readCmo3Archive(source).xml).toBe('hello')
})

test('rejects a ZIP entry that declares an excessive output size', () => {
  const zip = zipSync({contents: ENCODER.encode('hello')})
  new DataView(zip.buffer).setUint32(22, 256 * 1024 * 1024 + 1, true)
  const source = makeArchive([
    {
      bytes: zip,
      compression: 33,
      path: 'main.xml',
      tag: 'main_xml',
    },
  ])
  expect(() => readCmo3Archive(source)).toThrow('outside the supported range')
})
