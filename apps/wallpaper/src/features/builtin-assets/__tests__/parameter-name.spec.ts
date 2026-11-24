import {expect, it} from 'vitest'
import names from '../parameter-names.json'
import {parameterName} from '../parameter-name'

it.each(Object.entries(names))(
  'should localize the builtin %s parameter without changing its name',
  (id, name) => {
    const parameter = {id, name}
    expect(parameterName(parameter, 'en')).not.toMatch(/[가-힣]/u)
    expect(parameterName(parameter, 'ko')).toBe(name)
    expect(parameter).toEqual({id, name})
  },
)

it('should describe hair movement, joints and bag straps in English', () => {
  expect(parameterName({id: 'TouchHairFrontLeft19', name: '왼쪽 앞머리 좌우 1'}, 'en')).toBe(
    'Left bangs horizontal 1',
  )
  expect(parameterName({id: 'TouchRightKnee', name: '오른다리 무릎'}, 'en')).toBe('Right knee')
  expect(parameterName({id: 'TouchBagStrap', name: '숄더백 끈'}, 'en')).toBe('Shoulder bag strap')
})

it('should retain renamed, imported and existing English names and fall back to the ID', () => {
  expect(parameterName({id: 'TouchRightKnee', name: '내가 만든 무릎'}, 'en')).toBe('내가 만든 무릎')
  expect(parameterName({id: 'custom', name: '오른다리 무릎'}, 'en')).toBe('오른다리 무릎')
  expect(parameterName({id: 'ParamAngleX', name: 'Angle X'}, 'en')).toBe('Angle X')
  expect(parameterName({id: 'custom'}, 'en')).toBe('custom')
  expect(parameterName({id: 'custom', name: ''}, 'en')).toBe('custom')
})
