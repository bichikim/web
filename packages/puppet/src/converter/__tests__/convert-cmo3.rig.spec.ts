import {expect, test} from 'vitest'
import {zipSync} from 'fflate'
import {convertCmo3} from '../index'
import {composeParameterScene} from '../../deformation/scene'
import {composeParameterVertices} from '../../deformation/composition'
import {applySceneNodeDeformers} from '../../deformation/vertices'
import {serializeDocument} from '../../player/serialize-document'
import {parseDocument} from '../../player/parse-document'
import type {PuppetDocument} from '../../player/document'
import {composeParameterPartProperties} from '../../deformation/part-properties'
import {composeParameterPartDrawOrder} from '../../deformation/draw-order'
import {createPhysicsState, evaluatePhysics} from '../../player/internal/physics'
import {getScenePartStates} from '../../player/scene'
import {getDrawOrderedPartStates} from '../../player/internal/scene-draw-order'

const parameter = (id: string) => `<CParameterSource><CParameterGuid xs.n="guid" uuid="${id}"/>
  <CParameterId xs.n="id" idstr="${id}"/><s xs.n="name">${id}</s><f xs.n="minValue">0</f>
  <f xs.n="maxValue">1</f><f xs.n="defaultValue">0</f></CParameterSource>`

const grid = (
  id: string,
  axes: ReadonlyArray<string>,
) => `<KeyformGridSource xs.n="keyformGridSource">
  <array_list xs.n="keyformBindings">${axes
    .map(
      (axis) => `<KeyformBindingSource xs.id="${id}-${axis}">
    <CParameterGuid xs.n="parameterGuid" uuid="${axis}"/><array_list xs.n="keys"><f>0</f><f>1</f></array_list>
    </KeyformBindingSource>`,
    )
    .join('')}</array_list>
  <array_list xs.n="keyformsOnGrid">${Array.from(
    {length: 2 ** axes.length},
    (_, index) => `<KeyformOnGrid>
    <CFormGuid xs.n="keyformGuid" uuid="${id}-${index}"/><KeyformGridAccessKey xs.n="accessKey">
    <array_list xs.n="_keyOnParameterList">${axes
      .map(
        (axis, offset) => `<KeyOnParameter>
      <KeyformBindingSource xs.n="binding" xs.ref="${id}-${axis}"/>
      <i xs.n="keyIndex">${Math.floor(index / 2 ** offset) % 2}</i>
    </KeyOnParameter>`,
      )
      .join('')}</array_list></KeyformGridAccessKey></KeyformOnGrid>`,
  ).join('')}</array_list></KeyformGridSource>`

const xml = (axes: ReadonlyArray<string> = ['MouthOpen']) => `<root><main><CModelSource>
  <CImageCanvas xs.n="canvas"><i xs.n="pixelWidth">200</i><i xs.n="pixelHeight">200</i></CImageCanvas>
  <CParameterSourceSet xs.n="parameterSourceSet"><carray_list xs.n="_sources">
    ${['Angle', ...axes].map(parameter).join('')}
  </carray_list></CParameterSourceSet>
  <CDeformerSourceSet xs.n="deformerSourceSet"><carray_list xs.n="_sources">
    <CWarpDeformerSource><ACDeformerSource xs.n="super">
      <CDeformerId xs.n="id" idstr="warp"/><CDeformerGuid xs.n="guid" uuid="warp"/>
      </ACDeformerSource>
      <i xs.n="col">1</i><i xs.n="row">1</i><carray_list xs.n="keyforms"><CWarpDeformerForm>
      <float-array xs.n="positions">0 0 100 0 0 200 100 200</float-array>
    </CWarpDeformerForm></carray_list></CWarpDeformerSource>
    <CRotationDeformerSource><ACDeformerSource xs.n="super"><ACParameterControllableSource xs.n="super">
      ${grid('rotate', ['Angle'])}</ACParameterControllableSource>
      <CDeformerId xs.n="id" idstr="rotate"/><CDeformerGuid xs.n="guid" uuid="rotate"/>
      <CDeformerGuid xs.n="targetDeformerGuid" uuid="warp"/>
    </ACDeformerSource><f xs.n="baseAngle">0</f><carray_list xs.n="keyforms">${[0, 90]
      .map(
        (
          angle,
          index,
        ) => `<CRotationDeformerForm originX="0.5" originY="0.5" angle="${angle}" scale="1">
      <ACDeformerForm xs.n="super"><ACForm xs.n="super"><CFormGuid xs.n="guid" uuid="rotate-${index}"/>
      </ACForm></ACDeformerForm>
    </CRotationDeformerForm>`,
      )
      .join('')}</carray_list></CRotationDeformerSource>
  </carray_list></CDeformerSourceSet>
  <CDrawableSourceSet xs.n="drawableSourceSet"><carray_list xs.n="_sources"><CArtMeshSource>
    <ACDrawableSource xs.n="super"><ACParameterControllableSource xs.n="super">
      ${grid('mouth', axes)}</ACParameterControllableSource>
      <CDrawableId xs.n="id" idstr="mouth"/><CDrawableGuid xs.n="guid" uuid="mouth"/>
      <CDeformerGuid xs.n="targetDeformerGuid" uuid="rotate"/>
    </ACDrawableSource><float-array xs.n="positions">40 90 60 90 40 110</float-array>
    <float-array xs.n="uvs">0 0 1 0 0 1</float-array><int-array xs.n="indices">0 1 2</int-array>
    <GTexture2D xs.n="texture"><CImageResource xs.n="srcImageResource" width="1" height="1">
      <file xs.n="imageFileBuf" path="image.png"/></CImageResource></GTexture2D>
    <carray_list xs.n="keyforms">${Array.from(
      {length: 2 ** axes.length},
      (_, index) => `<CArtMeshForm>
      <ACDrawableForm xs.n="super"><ACForm xs.n="super"><CFormGuid xs.n="guid" uuid="mouth-${index}"/></ACForm>
        <f xs.n="opacity">${index === 0 ? 1 : 0.5}</f><i xs.n="drawOrder">${500 + index}</i></ACDrawableForm>
      <float-array xs.n="positions">-10 -10 10 -10 -10 ${10 + index * 10}</float-array>
    </CArtMeshForm>`,
    ).join('')}</carray_list>
  </CArtMeshSource></carray_list></CDrawableSourceSet>
</CModelSource></main></root>`

const archive = (source: string): Uint8Array => {
  const encoder = new TextEncoder()
  const entries = [
    {
      bytes: zipSync({contents: encoder.encode(source)}),
      compression: 33,
      path: 'main.xml',
      tag: 'main_xml',
    },
    {
      bytes: Uint8Array.from(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/qV8AAAAASUVORK5CYII=',
          'base64',
        ),
      ),
      compression: 16,
      path: 'image.png',
      tag: 'image',
    },
  ]
  const header = 54
  const length =
    4 + entries.reduce((sum, entry) => sum + 24 + entry.path.length + entry.tag.length, 0)
  const bytes = new Uint8Array(
    header + length + entries.reduce((sum, entry) => sum + entry.bytes.length, 0),
  )
  const view = new DataView(bytes.buffer)
  bytes.set(encoder.encode('CAFF'))
  view.setInt32(header, entries.length)
  let position = header + 4
  let offset = header + length
  for (const entry of entries) {
    bytes[position] = entry.path.length
    position += 1
    bytes.set(encoder.encode(entry.path), position)
    position += entry.path.length
    bytes[position] = entry.tag.length
    position += 1
    bytes.set(encoder.encode(entry.tag), position)
    position += entry.tag.length
    view.setUint32(position + 4, offset)
    position += 8
    view.setInt32(position, entry.bytes.length)
    position += 4
    bytes[position] = 0
    position += 1
    bytes[position] = entry.compression
    position += 1
    position += 8
    bytes.set(entry.bytes, offset)
    offset += entry.bytes.length
  }
  return bytes
}

test('should import nested warp and rotation with animated mouth coordinates', () => {
  const {document} = convertCmo3(archive(xml()))
  expect(document.parameters?.map((entry) => entry.id)).toEqual(['Angle', 'MouthOpen'])
  const vertices = new Map(
    document.parts.map((part) => [
      part.id,
      [
        ...composeParameterVertices({
          document,
          parameterValues: {Angle: 0, MouthOpen: 1},
          partId: part.id,
          restVertices: part.mesh.vertices,
        }),
      ],
    ]),
  )
  applySceneNodeDeformers(composeParameterScene(document, {Angle: 0, MouthOpen: 1}).roots, vertices)
  expect(vertices.get('mouth')).toEqual(
    expect.arrayContaining([expect.closeTo(40, 4), expect.closeTo(120, 4)]),
  )
  const rotated = new Map(
    document.parts.map((part) => [
      part.id,
      [
        ...composeParameterVertices({
          document,
          parameterValues: {Angle: 1, MouthOpen: 1},
          partId: part.id,
          restVertices: part.mesh.vertices,
        }),
      ],
    ]),
  )
  applySceneNodeDeformers(composeParameterScene(document, {Angle: 1, MouthOpen: 1}).roots, rotated)
  expect(rotated.get('mouth')?.[0]).toBeCloseTo(60, 4)
  expect(rotated.get('mouth')?.[1]).toBeCloseTo(90, 4)
  expect(parseDocument(serializeDocument(document)).ok).toBe(true)
})

test('should preserve four-dimensional expression grids by composing parameter slices', () => {
  const {document} = convertCmo3(archive(xml(['MouthOpen', 'Smile', 'Jaw', 'Pucker'])))
  expect(document.parameters).toHaveLength(5)
  const values = {Angle: 0, Jaw: 1, MouthOpen: 1, Pucker: 1, Smile: 1}
  const vertices = new Map(
    document.parts.map((part) => [
      part.id,
      [
        ...composeParameterVertices({
          document,
          parameterValues: values,
          partId: part.id,
          restVertices: part.mesh.vertices,
        }),
      ],
    ]),
  )
  applySceneNodeDeformers(composeParameterScene(document, values).roots, vertices)
  expect(vertices.get('mouth')?.[5]).toBeCloseTo(260, 4)
  expect(
    document.parameterBindings?.filter((binding) =>
      binding.influences?.some((entry) => entry.parameterId === 'Pucker'),
    ),
  ).toHaveLength(2)
})

test('should multiply slice weights when an expression grid has five axes', () => {
  const {document} = convertCmo3(archive(xml(['MouthOpen', 'Smile', 'Jaw', 'Pucker', 'Tongue'])))
  const values = {Jaw: 0, MouthOpen: 0, Pucker: 0.5, Smile: 0, Tongue: 0.5}
  expect(renderVertices(document, values)[5]).toBeCloseTo(230)
  expect(
    composeParameterPartProperties({document, parameterValues: values, partId: 'mouth'}).opacity,
  ).toBeCloseTo(0.625)
})

test('should interpolate all corners of a coupled two-axis expression', () => {
  let index = 0
  const source = xml(['MouthOpen', 'Smile']).replace(
    /<float-array xs.n="positions">-10 -10 10 -10 -10 \d+<\/float-array>/gu,
    () => {
      const height = index === 3 ? 30 : 10
      index += 1
      return `<float-array xs.n="positions">-10 -10 10 -10 -10 ${height}</float-array>`
    },
  )
  const {document} = convertCmo3(archive(source))
  expect(renderVertices(document, {MouthOpen: 0.5, Smile: 0.5})[5]).toBeCloseTo(115)
})

test('should reject a broken rig reference instead of silently exporting static geometry', () => {
  expect(() =>
    convertCmo3(archive(xml().replace('xs.ref="rotate-Angle"', 'xs.ref="missing"'))),
  ).toThrow(/reference|grid/u)
})

const inPartFolder = (folder: string) =>
  xml()
    .replace(
      '<CDeformerSourceSet',
      `<CPartSourceSet xs.n="partSourceSet"><carray_list xs.n="_sources">${folder}
      </carray_list></CPartSourceSet><CDeformerSourceSet`,
    )
    .replace(
      '<ACDrawableSource xs.n="super"><ACParameterControllableSource xs.n="super">',
      `<ACDrawableSource xs.n="super"><ACParameterControllableSource xs.n="super">
      <CPartGuid xs.n="parentGuid" xs.ref="folder-guid"/>`,
    )

test('should inherit hidden ancestor folders instead of drawing a guide over the rig', () => {
  const source = inPartFolder(`<CPartSource><CPartId xs.n="id" idstr="folder-part"/>
    <CPartGuid xs.n="guid" xs.id="folder-guid" uuid="folder"/>
    <ACParameterControllableSource xs.n="super"><b xs.n="isVisible">true</b>
    <CPartGuid xs.n="parentGuid" uuid="hidden"/></ACParameterControllableSource></CPartSource>
    <CPartSource><CPartId xs.n="id" idstr="hidden-part"/><CPartGuid xs.n="guid" uuid="hidden"/>
      <ACParameterControllableSource xs.n="super">
    <b xs.n="isVisible">false</b></ACParameterControllableSource></CPartSource>`)
  const {document} = convertCmo3(archive(source))
  expect(getScenePartStates(document)).toEqual([{locked: false, partId: 'mouth', visible: false}])
})

test('should omit visible sketch folders from the rendered model', () => {
  const source = inPartFolder(`<CPartSource><CPartId xs.n="id" idstr="folder-part"/>
    <CPartGuid xs.n="guid" xs.id="folder-guid" uuid="folder"/>
    <b xs.n="isSketch">true</b><ACParameterControllableSource xs.n="super">
    <b xs.n="isVisible">true</b></ACParameterControllableSource></CPartSource>`)
  const {document} = convertCmo3(archive(source))
  expect(getScenePartStates(document)[0]?.visible).toBe(false)
})

test('should reject cyclic part folders', () => {
  const source = inPartFolder(`<CPartSource><CPartId xs.n="id" idstr="folder-part"/>
    <CPartGuid xs.n="guid" xs.id="folder-guid" uuid="folder"/>
    <ACParameterControllableSource xs.n="super"><CPartGuid xs.n="parentGuid" uuid="folder"/>
    </ACParameterControllableSource></CPartSource>`)
  expect(() => convertCmo3(archive(source))).toThrow(/cycle|hierarchy/u)
})

test('should preserve palette priority for equal draw orders across export and reload', () => {
  const source = inPartFolder(`<CPartSource><CPartId xs.n="id" idstr="folder-part"/>
    <CPartGuid xs.n="guid" xs.id="folder-guid" uuid="folder"/>
    <carray_list xs.n="_childGuids"><CDrawableGuid uuid="mouth"/><CDrawableGuid uuid="back"/>
    </carray_list></CPartSource>`).replace(/<CArtMeshSource>.*?<\/CArtMeshSource>/su, (mesh) =>
    [mesh, mesh.replaceAll('mouth', 'back')].join(''),
  )
  const {document} = convertCmo3(archive(source))
  const reloaded = parseDocument(serializeDocument(document))
  expect(reloaded.ok).toBe(true)
  if (!reloaded.ok) {
    throw new Error('Expected exported rig to reload')
  }
  expect(getDrawOrderedPartStates(reloaded.document).map((part) => part.partId)).toEqual([
    'back',
    'mouth',
  ])
})

const renderVertices = (document: PuppetDocument, values: Readonly<Record<string, number>>) => {
  const vertices = new Map(
    document.parts.map((part) => [
      part.id,
      [
        ...composeParameterVertices({
          document,
          parameterValues: values,
          partId: part.id,
          restVertices: part.mesh.vertices,
        }),
      ],
    ]),
  )
  applySceneNodeDeformers(composeParameterScene(document, values).roots, vertices)
  return vertices.get('mouth')!
}

test('should preserve opacity and draw-order expression keyforms', () => {
  const {document} = convertCmo3(archive(xml()))
  const part = document.parts[0]!
  const properties = composeParameterPartProperties({
    document,
    parameterValues: {MouthOpen: 1},
    partId: part.id,
  })
  expect(properties.opacity).toBeCloseTo(0.5)
  expect(composeParameterPartDrawOrder(document, part.id, {MouthOpen: 1})).toBeCloseTo(501)
})

test('should resolve shared parameter-key references in another archive layout', () => {
  const original = '<KeyformBindingSource xs.n="binding" xs.ref="mouth-MouthOpen"/>'
  const source = xml()
    .replace(
      '<root>',
      `<root><KeyOnParameter xs.id="shared">${original}
    <i xs.n="keyIndex">1</i></KeyOnParameter>`,
    )
    .replace(
      new RegExp(
        '<KeyOnParameter>\\s*<KeyformBindingSource xs.n="binding" xs.ref="mouth-MouthOpen"/>' +
          '\\s*<i xs.n="keyIndex">1</i>\\s*</KeyOnParameter>',
        'u',
      ),
      '<KeyOnParameter xs.ref="shared"/>',
    )
  const {document} = convertCmo3(archive(source))
  expect(renderVertices(document, {MouthOpen: 1})[5]).toBeCloseTo(120)
})

const morphSource = () => {
  const morph = `<KeyFormMorphTargetSet xs.n="keyformMorphTargetSet"><carray_list xs.n="_morphTargets">
    <MorphTarget><CParameterGuid xs.n="parameterGuid" uuid="Jaw"/><f xs.n="keyValue">1</f>
    <CFormGuid xs.n="keyformGuid" uuid="jaw-form"/></MorphTarget></carray_list>
    <MorphTargetBlendWeightConstraintSet xs.n="blendWeightConstraintSet"><carray_list xs.n="_constraints">
      ${[0, 1]
        .map(
          (value) => `<Constraint><CParameterGuid xs.n="morphTargetParameterGuid" uuid="Jaw"/>
      <CParameterGuid xs.n="constraintParameterGuid" uuid="Smile"/>
      <f xs.n="constraintParameterValue">${value}</f><f xs.n="blendWeight">${value}</f></Constraint>`,
        )
        .join('')}
    </carray_list></MorphTargetBlendWeightConstraintSet></KeyFormMorphTargetSet>`
  const source = xml()
    .replace(
      '</carray_list></CParameterSourceSet>',
      `${parameter('Jaw')}${parameter('Smile')}</carray_list></CParameterSourceSet>`,
    )
    .replace(
      `${grid('mouth', ['MouthOpen'])}</ACParameterControllableSource>`,
      `${grid('mouth', ['MouthOpen'])}${morph}</ACParameterControllableSource>`,
    )
    .replace(
      '</carray_list>\n  </CArtMeshSource>',
      `<CArtMeshForm><ACDrawableForm xs.n="super"><ACForm xs.n="super">
      <CFormGuid xs.n="guid" uuid="jaw-form"/></ACForm></ACDrawableForm>
      <float-array xs.n="positions">-10 -10 10 -10 -10 30</float-array>
      </CArtMeshForm></carray_list>\n  </CArtMeshSource>`,
    )
  return source
}

test('should add morph offsets to expression grids with constraint weights', () => {
  const {document} = convertCmo3(archive(morphSource()))
  expect(renderVertices(document, {Jaw: 1, MouthOpen: 1, Smile: 0})[5]).toBeCloseTo(120)
  expect(renderVertices(document, {Jaw: 1, MouthOpen: 1, Smile: 1})[5]).toBeCloseTo(140)
})

const physics = `<CPhysicsSettingsSourceSet xs.n="physicsSettingsSourceSet"><i xs.n="settingFPS">60</i>
    <carray_list xs.n="_sourceCubismPhysics"><CPhysicsSettingsSource><CPhysicsSettingId xs.n="id" idstr="jaw"/>
    <carray_list xs.n="inputs"><CPhysicsInput><CParameterGuid xs.n="source" uuid="Angle"/>
      <CPhysicsSourceType xs.n="type" v="SRC_TO_X"/><f xs.n="weight">100</f></CPhysicsInput></carray_list>
    <carray_list xs.n="outputs"><CPhysicsOutput><CParameterGuid xs.n="destination" uuid="MouthOpen"/>
      <CPhysicsSourceType xs.n="type" v="SRC_TO_G_ANGLE"/><f xs.n="angleScale">3</f>
      <f xs.n="weight">100</f><i xs.n="vertexIndex">1</i></CPhysicsOutput></carray_list>
    <carray_list xs.n="vertices"><CPhysicsVertex/><CPhysicsVertex><f xs.n="radius">10</f>
      <f xs.n="mobility">0.8</f><f xs.n="delay">0.7</f><f xs.n="acceleration">1</f></CPhysicsVertex></carray_list>
    <f xs.n="normalizedPositionValueMin">-10</f><f xs.n="normalizedPositionValueMax">10</f>
    <f xs.n="normalizedPositionDefaultValue">0</f><f xs.n="normalizedAngleValueMin">-30</f>
    <f xs.n="normalizedAngleValueMax">30</f><f xs.n="normalizedAngleDefaultValue">0</f>
    </CPhysicsSettingsSource></carray_list></CPhysicsSettingsSourceSet>`

test('should import embedded physics and propagate its output to rig parameters', () => {
  const {document} = convertCmo3(
    archive(xml().replace('</CModelSource>', `${physics}</CModelSource>`)),
  )
  expect(document.physics?.chains).toHaveLength(1)
  let result = evaluatePhysics({
    deltaTime: 1 / 60,
    document,
    parameterValues: {Angle: 0, MouthOpen: 0},
    physicsState: createPhysicsState(document),
  })
  const outputs: number[] = []
  for (let frame = 0; frame < 60; frame += 1) {
    result = evaluatePhysics({
      chainState: result.chainState,
      deltaTime: 1 / 60,
      document,
      parameterValues: {Angle: frame < 30 ? 1 : 0, MouthOpen: 0},
      physicsState: result.physicsState,
    })
    outputs.push(result.parameterValues.MouthOpen!)
  }
  expect(outputs.every(Number.isFinite)).toBe(true)
  expect(outputs.some((value) => Math.abs(value) > 0)).toBe(true)
})

test('should resolve shared physics inputs, outputs, vertices and axis types', () => {
  const inline = xml().replace('</CModelSource>', `${physics}</CModelSource>`)
  let shared = inline
  for (const tag of ['CPhysicsInput', 'CPhysicsOutput', 'CPhysicsVertex']) {
    let index = 0
    const definitions: string[] = []
    shared = shared.replace(new RegExp(`<${tag}>(.*?)</${tag}>`, 'gsu'), (match) => {
      const id = `${tag}-${index}`
      index += 1
      definitions.push(match.replace(`<${tag}>`, `<${tag} xs.id="${id}">`))
      return `<${tag} xs.ref="${id}"/>`
    })
    shared = shared.replace('</root>', `${definitions.join('')}</root>`)
  }
  const definitions: string[] = []
  shared = shared
    .replace(/<CPhysicsSourceType xs.n="type" v="([^"]+)"\/>/gu, (_, value: string) => {
      const id = `axis-${definitions.length}`
      definitions.push(`<CPhysicsSourceType xs.id="${id}" v="${value}"/>`)
      return `<CPhysicsSourceType xs.n="type" xs.ref="${id}"/>`
    })
    .replace('<f xs.n="radius">10</f>', '<f xs.n="radius" xs.ref="radius"/>')
    .replace('</root>', `${definitions.join('')}<f xs.id="radius">10</f></root>`)
  expect(definitions).toHaveLength(2)
  expect(convertCmo3(archive(shared)).document.physics?.chains).toHaveLength(1)
  expect(convertCmo3(archive(shared)).document.physics).toEqual(
    convertCmo3(archive(inline)).document.physics,
  )
})

test('should preserve physics endpoints when their center lies outside the range', () => {
  const original = physics
    .replace('normalizedPositionValueMax">10', 'normalizedPositionValueMax">-10')
    .replace('normalizedAngleValueMin">-30', 'normalizedAngleValueMin">-90')
    .replace('normalizedAngleValueMax">30', 'normalizedAngleValueMax">-90')
    .replace('normalizedAngleDefaultValue">0', 'normalizedAngleDefaultValue">90')
  const {document} = convertCmo3(
    archive(xml().replace('</CModelSource>', `${original}</CModelSource>`)),
  )
  expect(document.physics?.chains?.[0]?.normalization).toEqual({
    angle: {center: 90, maximum: -90, minimum: -90},
    position: {center: 0, maximum: -10, minimum: -10},
  })
  const result = evaluatePhysics({
    deltaTime: 1 / 60,
    document,
    parameterValues: {Angle: 1, MouthOpen: 0},
    physicsState: createPhysicsState(document),
  })
  expect(result.chainState.chains.get('jaw')?.root[0]).toBeCloseTo(10)
})

test('should resolve shared CMO3 parameter identifiers', () => {
  const source = xml()
    .replace('<root>', '<root><CParameterId xs.id="angle-id" idstr="Angle"/>')
    .replace(
      '<CParameterId xs.n="id" idstr="Angle"/>',
      '<CParameterId xs.n="id" xs.ref="angle-id"/>',
    )
  expect(
    convertCmo3(archive(source)).document.parameters?.some((entry) => entry.id === 'Angle'),
  ).toBe(true)
})

test('should wrap an expression axis after it becomes a weighted slice', () => {
  const source = xml(['MouthOpen', 'Smile', 'Jaw', 'Pucker'])
    .replace(
      parameter('Pucker'),
      parameter('Pucker').replace(
        '</CParameterSource>',
        '<b xs.n="isRepeat">true</b></CParameterSource>',
      ),
    )
    .replace(
      'uuid="Pucker"/><array_list xs.n="keys"><f>0</f><f>1</f>',
      'uuid="Pucker"/><array_list xs.n="keys"><f>0</f><f>0.5</f>',
    )
  const {document} = convertCmo3(archive(source))
  expect(renderVertices(document, {Pucker: 0.75})[5]).toBeCloseTo(150)
  expect(renderVertices(document, {Pucker: 1.25})[5]).toBeCloseTo(150)
})

test.each([
  {reflection: false, scale: 1.25, value: 0.25},
  {reflection: true, scale: 2, value: 1},
])('should keep sliced reflection discrete and rotation scale continuous at $value', (sample) => {
  const forms = Array.from(
    {length: 16},
    (_, index) => `<CRotationDeformerForm originX="0.5" originY="0.5" angle="0"
    scale="${index < 8 ? 1 : 2}" isReflectX="${index >= 8}">
    <ACDeformerForm xs.n="super"><ACForm xs.n="super"><CFormGuid xs.n="guid" uuid="rotate-${index}"/>
    </ACForm></ACDeformerForm></CRotationDeformerForm>`,
  ).join('')
  const source = xml(['MouthOpen', 'Smile', 'Pucker'])
    .replace(grid('rotate', ['Angle']), grid('rotate', ['Angle', 'MouthOpen', 'Smile', 'Pucker']))
    .replace(
      /(<f xs.n="baseAngle">0<\/f><carray_list xs.n="keyforms">)[\s\S]*?(<\/carray_list><\/CRotationDeformerSource>)/u,
      (_, before: string, after: string) => before + forms + after,
    )
  const {document} = convertCmo3(archive(source))
  const root = composeParameterScene(document, {Pucker: sample.value}).roots[0]!
  const rotation = root.kind === 'deformer' ? root.children[0] : undefined
  expect(rotation?.kind).toBe('deformer')
  if (rotation?.kind === 'deformer') {
    expect(rotation.rotationReflection).toEqual([sample.reflection, false])
    expect(rotation.rotationScale).toBeCloseTo(sample.scale)
  }
})

test('should retain morphs and constraints stored as shared XML lists', () => {
  const definitions: string[] = []
  const source = morphSource()
    .replace(
      /<carray_list xs.n="(_morphTargets|_constraints)">([\s\S]*?)<\/carray_list>/gu,
      (_, name: string, content: string) => {
        definitions.push(`<carray_list xs.id="${name}">${content}</carray_list>`)
        return `<carray_list xs.n="${name}" xs.ref="${name}"/>`
      },
    )
    .replace('</root>', `${definitions.join('')}</root>`)
  const {document} = convertCmo3(archive(source))
  expect(renderVertices(document, {Jaw: 1, MouthOpen: 1, Smile: 0})[5]).toBeCloseTo(120)
  expect(renderVertices(document, {Jaw: 1, MouthOpen: 1, Smile: 1})[5]).toBeCloseTo(140)
})
