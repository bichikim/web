import {DOMParser} from '@xmldom/xmldom'
import {expect, test} from 'vitest'
import {composeParameterScene} from '../../deformation/scene'
import {createEmptyDocument} from '../../player/create-empty-document'
import {convertCmo3Rig} from '../convert-cmo3-rig'

test('should retain multiple full turns in imported rotation keyforms', () => {
  const xml = new DOMParser().parseFromString(
    `<CModelSource>
      <CParameterSourceSet><carray_list xs.n="_sources"><CParameterSource>
        <CParameterId xs.n="id" idstr="turn"/><CParameterGuid xs.n="guid" uuid="parameter"/>
        <f xs.n="minValue">0</f><f xs.n="maxValue">1</f><f xs.n="defaultValue">0</f>
      </CParameterSource></carray_list></CParameterSourceSet>
      <KeyformBindingSource xs.id="binding"><CParameterGuid xs.n="parameterGuid" uuid="parameter"/>
        <array_list xs.n="keys"><f>0</f><f>1</f></array_list>
      </KeyformBindingSource>
      <CDeformerSourceSet><carray_list xs.n="_sources"><CRotationDeformerSource>
        <CDeformerId xs.n="id" idstr="spin"/><CDeformerGuid xs.n="guid" uuid="spin-guid"/>
        <KeyformGridSource xs.n="keyformGridSource">
          <array_list xs.n="keyformBindings"><KeyformBindingSource xs.ref="binding"/></array_list>
          <array_list xs.n="keyformsOnGrid">${[0, 1]
            .map(
              (index) => `
            <KeyformOnGrid><CFormGuid xs.n="keyformGuid" uuid="form-${index}"/>
              <KeyformGridAccessKey xs.n="accessKey"><KeyOnParameter>
                <KeyformBindingSource xs.n="binding" xs.ref="binding"/><i xs.n="keyIndex">${index}</i>
              </KeyOnParameter></KeyformGridAccessKey>
            </KeyformOnGrid>`,
            )
            .join('')}</array_list>
        </KeyformGridSource>
        <carray_list xs.n="keyforms">${[0, 720]
          .map(
            (angle, index) => `
          <CRotationDeformerForm angle="${angle}" originX="0" originY="0" scale="1">
            <CFormGuid xs.n="guid" uuid="form-${index}"/>
          </CRotationDeformerForm>`,
          )
          .join('')}</carray_list>
      </CRotationDeformerSource></carray_list></CDeformerSourceSet>
    </CModelSource>`,
    'application/xml',
  )
  const references = new Map(
    Array.from(xml.getElementsByTagName('*')).flatMap((element) => {
      const id = element.getAttribute('xs.id')
      return id === null ? [] : [[id, element] as const]
    }),
  )
  const meshSource = new DOMParser().parseFromString(
    '<CArtMeshSource><CDeformerGuid xs.n="targetDeformerGuid" uuid="spin-guid"/></CArtMeshSource>',
    'application/xml',
  ).documentElement!
  const part = {
    id: 'mesh',
    mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
    texture: {height: 1, src: 'texture.png', width: 1},
  }
  const rig = convertCmo3Rig(xml.documentElement!, references, [{part, source: meshSource}])
  const document = {...createEmptyDocument(), ...rig}
  const keyform = rig.parameterBindings[0]?.keyforms[1]?.deformers?.[0]
  expect(keyform?.rotationAngle).toBeCloseTo(4 * Math.PI)
  const posed = composeParameterScene(document, {turn: 0.25}).roots[0]
  expect(posed?.kind).toBe('deformer')
  if (posed?.kind === 'deformer') {
    expect(posed.rotationAngle).toBeCloseTo(Math.PI)
    expect(posed.controlPoints[2]).toBeCloseTo(-1)
  }
})
