import {DOMParser} from '@xmldom/xmldom'
import {expect, test} from 'vitest'
import {readCmo3Glue} from '../read-cmo3-glue'
import {createDemoDocument} from '../../player/create-demo-document'
import {composeParameterGlue} from '../../deformation/parameter-glue'
import {applyGlue} from '../../deformation/glue'

test('should convert parameter-driven glue strength and apply it between mesh vertices', () => {
  const xml = new DOMParser().parseFromString(
    `<CModelSource>
    <CAffecterSourceSet><carray_list xs.n="_sources"><CGlueSource>
      <CAffecterId xs.n="id" idstr="seam"/>
      <CDrawableGuid xs.n="targetArtMeshA_guid" uuid="a"/>
      <CDrawableGuid xs.n="targetArtMeshB_guid" uuid="b"/>
      <float-array xs.n="weights">0.25 0.75</float-array>
      <long-array xs.n="bindVertexUids">10 20</long-array>
      <carray_list xs.n="keyforms">${[0, 1]
        .map(
          (strength) => `<CGlueForm>
        <CFormGuid xs.n="guid" uuid="f${strength}"/><f xs.n="intensity">${strength}</f>
      </CGlueForm>`,
        )
        .join('')}</carray_list>
      <KeyformGridSource xs.n="keyformGridSource">
        <array_list xs.n="keyformBindings"><KeyformBindingSource xs.id="binding">
          <CParameterGuid xs.n="parameterGuid" uuid="parameter"/>
          <array_list xs.n="keys"><f>0</f><f>1</f></array_list>
        </KeyformBindingSource></array_list>
        <array_list xs.n="keyformsOnGrid">${[0, 1]
          .map(
            (index) => `<KeyformOnGrid>
          <CFormGuid xs.n="keyformGuid" uuid="f${index}"/>
          <KeyformGridAccessKey xs.n="accessKey"><KeyOnParameter>
            <KeyformBindingSource xs.n="binding" xs.ref="binding"/><i xs.n="keyIndex">${index}</i>
          </KeyOnParameter></KeyformGridAccessKey>
        </KeyformOnGrid>`,
          )
          .join('')}</array_list>
      </KeyformGridSource>
    </CGlueSource></carray_list></CAffecterSourceSet>
  </CModelSource>`,
    'application/xml',
  )
  const source = (id: string, uid: number) =>
    new DOMParser().parseFromString(
      `<CArtMeshSource><CDrawableGuid xs.n="guid" uuid="${id}"/>
        <int-array xs.n="pointUid">${uid}</int-array></CArtMeshSource>`,
      'application/xml',
    ).documentElement!
  const references = new Map([['binding', xml.getElementsByTagName('KeyformBindingSource')[0]!]])
  const demo = createDemoDocument()
  const parameter = {defaultValue: 0.25, id: 'join', maximum: 1, minimum: 0, name: 'Join'}
  const result = readCmo3Glue(
    xml.documentElement!,
    references,
    [
      {part: demo.parts[0]!, source: source('a', 10)},
      {part: demo.parts[1]!, source: source('b', 20)},
    ],
    new Map([['parameter', parameter]]),
  )
  expect(result.glue[0]).toMatchObject({strength: 0.25, weight: 0.25})
  expect(result.parameterBindings[0]).toMatchObject({
    keyforms: [
      {glue: [{id: 'seam:0', strength: 0, weight: 0.25}], parts: []},
      {glue: [{id: 'seam:0', strength: 1, weight: 0.25}], parts: []},
    ],
    targetGlueIds: ['seam:0'],
  })
  expect(result.parameterBindings[0]!.targetPartIds).toBeUndefined()
  const document = {...demo, ...result, parameters: [parameter]}
  for (const value of [0, 0.25, 0.5, 1]) {
    const vertices = new Map([
      [demo.parts[0]!.id, [0, 0]],
      [demo.parts[1]!.id, [8, 0]],
    ])
    applyGlue(composeParameterGlue({document, parameterValues: {join: value}}), vertices)
    expect(vertices.get(demo.parts[0]!.id)).toEqual([2 * value, 0])
    expect(vertices.get(demo.parts[1]!.id)).toEqual([8 - 6 * value, 0])
  }
})

test('should report stale vertex UIDs while retaining the other glue connections', () => {
  const xml = new DOMParser().parseFromString(
    `<CModelSource>
    <CAffecterSourceSet><carray_list xs.n="_sources"><CGlueSource>
      <CAffecterId xs.n="id" idstr="seam"/>
      <CDrawableGuid xs.n="targetArtMeshA_guid" uuid="a"/>
      <CDrawableGuid xs.n="targetArtMeshB_guid" uuid="b"/>
      <float-array xs.n="weights">0.25 0.75 0.5 0.5</float-array>
      <long-array xs.n="bindVertexUids">10 20 999 20</long-array>
    </CGlueSource></carray_list></CAffecterSourceSet>
  </CModelSource>`,
    'application/xml',
  )
  const source = (id: string, uid: number) =>
    new DOMParser().parseFromString(
      `<CArtMeshSource><CDrawableGuid xs.n="guid" uuid="${id}"/>
      <int-array xs.n="pointUid">${uid}</int-array></CArtMeshSource>`,
      'application/xml',
    ).documentElement!
  const demo = createDemoDocument()
  const result = readCmo3Glue(
    xml.documentElement!,
    new Map(),
    [
      {part: demo.parts[0]!, source: source('a', 10)},
      {part: demo.parts[1]!, source: source('b', 20)},
    ],
    new Map(),
  )
  expect(result.glue).toHaveLength(1)
  expect(result.glue[0]).toMatchObject({
    first: {partId: demo.parts[0]!.id, vertexIndex: 0},
    second: {partId: demo.parts[1]!.id, vertexIndex: 0},
    weight: 0.25,
  })
  expect(result.warnings).toHaveLength(1)
  expect(result.warnings[0]).toContain('1')
})
