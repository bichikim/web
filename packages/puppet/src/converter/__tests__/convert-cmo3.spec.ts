import {zipSync} from 'fflate'
import {expect, test} from 'vitest'

import {convertCmo3} from '../convert-cmo3'
import {readCmo3Archive} from '../read-cmo3-archive'
import {parseDocument} from '../../player/parse-document'
import {serializeDocument} from '../../player/serialize-document'
import {composeParameterVertices} from '../../deformation/composition'
import {getPartRenderFrame, getPartRenderPlans} from '../../player/internal/render-plan'
import {composeParameterPartDrawOrder} from '../../deformation/draw-order'

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
    invertedMask: true,
  })
  expect(document.parts.find((part) => part.id === 'mask')?.properties).toMatchObject({
    renderWhenUsedAsMask: true,
  })
})

test('should retain Cubism painting order for equal draw orders independently of the deformer hierarchy', () => {
  const {document} = convertCmo3(archive(modelXml()))
  expect(document.drawOrderTieBreak).toBe('parts')
  expect(document.parts.map((part) => part.id)).toEqual(['eye', 'mask'])
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

test('should preserve parameter ranges, defaults and keyed mesh opacity and positions', () => {
  const parameter = `<CParameterSourceSet><carray_list xs.n="_sources">
    <CParameterSource><CParameterGuid xs.n="guid" uuid="parameter"/>
      <CParameterId xs.n="id" idstr="ParamEye"/><s xs.n="name">Eye</s>
      <f xs.n="minValue">0</f><f xs.n="maxValue">1</f><f xs.n="defaultValue">1</f>
    </CParameterSource></carray_list></CParameterSourceSet>`
  const grid = `<KeyformGridSource xs.n="keyformGridSource">
    <array_list xs.n="keyformBindings"><KeyformBindingSource xs.id="#binding">
      <CParameterGuid xs.n="parameterGuid" uuid="parameter"/>
      <array_list xs.n="keys"><f>0</f><f>1</f></array_list>
      <InterpolationType xs.n="interpolationType" v="LINEAR"/>
    </KeyformBindingSource></array_list>
    <array_list xs.n="keyformsOnGrid">${[0, 1]
      .map(
        (index) => `
      <KeyformOnGrid><KeyformGridAccessKey xs.n="accessKey">
        <array_list xs.n="_keyOnParameterList"><KeyOnParameter>
          <KeyformBindingSource xs.n="binding" xs.ref="#binding"/><i xs.n="keyIndex">${index}</i>
        </KeyOnParameter></array_list></KeyformGridAccessKey>
        <CFormGuid xs.n="keyformGuid" uuid="form-${index}"/>
      </KeyformOnGrid>`,
      )
      .join('')}</array_list></KeyformGridSource>`
  const forms = `<carray_list xs.n="keyforms">${[0, 1]
    .map(
      (index) => `
    <CArtMeshForm><ACDrawableForm xs.n="super"><ACForm xs.n="super">
      <CFormGuid xs.n="guid" uuid="form-${index}"/></ACForm>
      <f xs.n="opacity">${index}</f><i xs.n="drawOrder">${400 + index * 100}</i>
    </ACDrawableForm><float-array xs.n="positions">${index * 10} 0 ${index * 10 + 10} 0 ${index * 10} 10</float-array>
    </CArtMeshForm>`,
    )
    .join('')}</carray_list>`
  const mesh = artMesh('eye', '#eye-guid')
    .replace(
      '<CDrawableId',
      `<ACParameterControllableSource xs.n="super">${grid}</ACParameterControllableSource><CDrawableId`,
    )
    .replace('<int-array', `${forms}<int-array`)
  const xml = modelXml().replace(
    /<CDrawableSourceSet[\s\S]*?<\/CDrawableSourceSet>/u,
    `${parameter}<CDrawableSourceSet xs.n="drawableSourceSet">
      <carray_list xs.n="_sources">${mesh}</carray_list></CDrawableSourceSet>`,
  )
  const {document, warnings} = convertCmo3(archive(xml))
  expect(document.parameters).toEqual([
    {defaultValue: 1, id: 'ParamEye', maximum: 1, minimum: 0, name: 'Eye', repeat: false},
  ])
  expect(document.parameterBindings).toHaveLength(1)
  const part = document.parts[0]!
  expect(part.mesh.vertices).toEqual([10, 0, 20, 0, 10, 10])
  expect(part.properties).toMatchObject({drawOrder: 500, opacity: 1})
  expect(
    composeParameterVertices({
      document,
      parameterValues: {ParamEye: 0.5},
      partId: 'eye',
      restVertices: part.mesh.vertices,
    }),
  ).toEqual([5, 0, 15, 0, 5, 10])
  expect(composeParameterPartDrawOrder(document, 'eye', {ParamEye: 0.505})).toBe(450)
  expect(document.parameterBindings?.[0]?.keyforms[0]?.parts[0]?.properties).toMatchObject({
    drawOrder: 400,
    opacity: 0,
  })
  expect(warnings.some((warning) => warning.includes('파라미터 키폼'))).toBe(false)
})

test('should use the source part child list to break drawing-order ties', () => {
  const parts = `<CPartSourceSet><carray_list xs.n="_sources"><CPartSource>
    <ACParameterControllableSource xs.n="super"><s xs.n="localName">Root</s></ACParameterControllableSource>
    <CPartId xs.n="id" idstr="root"/><CPartGuid xs.n="guid" uuid="root-guid"/>
    <carray_list xs.n="_childGuids">
      <CDrawableGuid xs.ref="#eye-guid"/><CDrawableGuid xs.ref="#mask-guid"/></carray_list>
    </CPartSource></carray_list></CPartSourceSet>`
  const xml = modelXml().replace('<CDrawableSourceSet', `${parts}<CDrawableSourceSet`)
  const {document} = convertCmo3(archive(xml))
  expect(document.parts.map((part) => part.id)).toEqual(['mask', 'eye'])
})

test('should permit a shared mask with normal and inverted consumers', () => {
  const normal = artMesh('normal', '#normal-guid', '#mask-guid').replace(
    '<b xs.n="invertClippingMask">true</b>',
    '<b xs.n="invertClippingMask">false</b>',
  )
  const xml = modelXml()
    .replace('<main>', '<CDrawableGuid xs.id="#normal-guid" uuid="normal-uuid"/><main>')
    .replace('</carray_list></CDrawableSourceSet>', `${normal}</carray_list></CDrawableSourceSet>`)
  const {document} = convertCmo3(archive(xml))
  expect(document.parts.find((part) => part.id === 'normal')?.properties?.invertedMask).toBe(false)
  expect(document.parts.find((part) => part.id === 'eye')?.properties?.invertedMask).toBe(true)
  expect(
    document.parts.find((part) => part.id === 'mask')?.properties?.invertedMask,
  ).toBeUndefined()
})

test('should retain independent Cubism multiply and screen colors through the converted hierarchy', () => {
  const color = (name: string, value: number) =>
    `<CFloatColor xs.n="${name}" red="${value}" green="${value}" blue="${value}"/>`
  const group = `<CPartSourceSet><carray_list xs.n="_sources"><CPartSource>
    <CPartId xs.n="id" idstr="root"/><CPartGuid xs.n="guid" uuid="root-guid"/>
    <carray_list xs.n="keyforms"><CPartForm><CFormGuid xs.n="guid" uuid="group-form"/>
      ${color('multiplyColor', 0.5)}${color('screenColor', 0.5)}
    </CPartForm></carray_list>
  </CPartSource></carray_list></CPartSourceSet>`
  const mesh = artMesh('eye', '#eye-guid').replace(
    '<int-array',
    `
    <CPartGuid xs.n="parentGuid" uuid="root-guid"/>
    <carray_list xs.n="keyforms"><CArtMeshForm><CFormGuid xs.n="guid" uuid="mesh-form"/>
      <float-array xs.n="positions">0 0 10 0 0 10</float-array>
      ${color('multiplyColor', 0.5)}${color('screenColor', 0.25)}
    </CArtMeshForm></carray_list><int-array`,
  )
  const xml = modelXml().replace(
    /<CDrawableSourceSet[\s\S]*?<\/CDrawableSourceSet>/u,
    `${group}<CDrawableSourceSet xs.n="drawableSourceSet">
      <carray_list xs.n="_sources">${mesh}</carray_list></CDrawableSourceSet>`,
  )
  const {document} = convertCmo3(archive(xml))
  const plan = getPartRenderPlans(document)[0]!
  expect(plan.properties.multiplyColor).toEqual([0.25, 0.25, 0.25])
  expect(plan.properties.screenColor).toEqual([0.625, 0.625, 0.625])
})

test('should retain an empty drawable used as a clipping source across export and reload', () => {
  const source = modelXml().replace(
    '<int-array xs.n="indices">0 1 2</int-array>',
    '<int-array xs.n="indices"></int-array>',
  )
  const {document} = convertCmo3(archive(source))
  const reloaded = parseDocument(serializeDocument(document))
  expect(reloaded.ok).toBe(true)
  if (!reloaded.ok) {
    throw new Error('Expected converted mask to reload')
  }
  const eye = getPartRenderFrame(reloaded.document).plans.find((plan) => plan.partId === 'eye')
  expect(eye?.mask?.sources.map((entry) => entry.partId)).toEqual(['mask'])
  expect(reloaded.document.parts.find((part) => part.id === 'mask')?.mesh.indices).toEqual([])
})

test.each([
  ['MULTIPLY', 'multiply-compatible'],
  ['ADD', 'add-compatible'],
])('should retain %s blending and backface culling', (sourceMode, blendMode) => {
  const source = modelXml().replaceAll(
    '</CArtMeshSource>',
    `<ColorComposition xs.n="colorComposition" v="${sourceMode}"/>
      <b xs.n="culling">true</b></CArtMeshSource>`,
  )
  const {document} = convertCmo3(archive(source))
  expect(getPartRenderFrame(document).plans[0]?.properties).toMatchObject({
    blendMode,
    culling: true,
  })
})

test('should preserve topology when a default keyform collapses its triangles', () => {
  const forms = `<carray_list xs.n="keyforms"><CArtMeshForm>
    <float-array xs.n="positions">0 0 0 0 0 0</float-array>
  </CArtMeshForm></carray_list>`
  const source = modelXml().replaceAll('</CArtMeshSource>', `${forms}</CArtMeshSource>`)
  const {document} = convertCmo3(archive(source))
  expect(document.parts).toHaveLength(2)
  expect(document.parts[0]?.mesh).toMatchObject({
    indices: [0, 1, 2],
    validationSpace: 'indices',
    vertices: [0, 0, 0, 0, 0, 0],
  })
  expect(parseDocument(serializeDocument(document)).ok).toBe(true)
})
