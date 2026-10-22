import {DOMParser} from '@xmldom/xmldom'
import {expect, test} from 'vitest'
import {readCmo3Keyforms} from '../read-cmo3-keyforms'

const grid = (
  name: string,
  binding: string,
  forms: ReadonlyArray<string>,
) => `<KeyformGridSource xs.n="${name}">
  <array_list xs.n="keyformBindings"><KeyformBindingSource xs.ref="${binding}"/></array_list>
  <array_list xs.n="keyformsOnGrid">${forms
    .map(
      (id, index) => `<KeyformOnGrid>
    <CFormGuid xs.n="keyformGuid" uuid="${id}"/>
    <KeyformGridAccessKey xs.n="accessKey"><KeyOnParameter>
      <KeyformBindingSource xs.n="binding" xs.ref="${binding}"/><i xs.n="keyIndex">${index}</i>
    </KeyOnParameter></KeyformGridAccessKey>
  </KeyformOnGrid>`,
    )
    .join('')}</array_list>
</KeyformGridSource>`

const fixture = (type: string) => {
  const document = new DOMParser().parseFromString(
    `<root>
    <KeyformBindingSource xs.id="original"><CParameterGuid xs.n="parameterGuid" uuid="p"/>
      <InterpolationType xs.n="interpolationType" v="LINEAR"/>
      <ExtendedInterpolationType xs.n="extendedInterpolationType" v="${type}"/>
      <array_list xs.n="keys"><f>0</f><f>1</f></array_list>
    </KeyformBindingSource>
    <KeyformBindingSource xs.id="expanded"><CParameterGuid xs.n="parameterGuid" uuid="p"/>
      <InterpolationType xs.n="interpolationType" v="LINEAR"/>
      <array_list xs.n="keys"><f>0</f><f>0.5</f><f>1</f></array_list>
    </KeyformBindingSource>
    <CArtMeshSource>
      ${grid('keyformGridSource', 'original', ['first', 'last'])}
      <carray_list xs.n="keyforms"><CArtMeshForm><CFormGuid xs.n="guid" uuid="first"/></CArtMeshForm>
        <CArtMeshForm><CFormGuid xs.n="guid" uuid="last"/></CArtMeshForm></carray_list>
      <carray_list xs.n="_extensions"><CExtendedInterpolationExtension>
        ${grid('extendedKeyformGridSource', 'expanded', ['first', 'middle', 'last'])}
        <carray_list xs.n="normalExtendedKeyforms"><CArtMeshForm>
          <CFormGuid xs.n="guid" uuid="middle"/><float-array xs.n="positions">5 8</float-array>
        </CArtMeshForm></carray_list>
      </CExtendedInterpolationExtension></carray_list>
    </CArtMeshSource>
  </root>`,
    'application/xml',
  )
  const references = new Map(
    Array.from(document.getElementsByTagName('*')).map((element) => [
      element.getAttribute('xs.id') ?? '',
      element,
    ]),
  )
  return {references, source: document.getElementsByTagName('CArtMeshSource')[0]!}
}

test.each(['ELLIPSE', 'SNS_CURVE'])(
  'should preserve Cubism-generated %s keyforms instead of interpolating the original endpoints',
  (type) => {
    const {source, references} = fixture(type)
    const result = readCmo3Keyforms(source, references)
    expect(result.parameterGuids).toEqual(['p'])
    expect(result.forms.map((form) => form.values)).toEqual([[0], [0.5], [1]])
    expect(result.forms[1]!.form.getElementsByTagName('float-array')[0]?.textContent).toBe('5 8')
  },
)

test('should ignore stored extended forms when extended interpolation has been disabled', () => {
  const {source, references} = fixture('LINEAR')
  expect(readCmo3Keyforms(source, references).forms.map((form) => form.values)).toEqual([[0], [1]])
})

test('should reject missing generated forms instead of silently changing the trajectory', () => {
  const {source, references} = fixture('ELLIPSE')
  const list = source.getElementsByTagName('CExtendedInterpolationExtension')[0]!
  list.parentNode!.removeChild(list)
  expect(() => readCmo3Keyforms(source, references)).toThrow('generated keyforms')
})
